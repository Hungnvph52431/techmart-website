import { PoolConnection, RowDataPacket } from 'mysql2/promise';

/**
 * Quy tắc tích điểm:
 *  - 1.000đ = 1 điểm (làm tròn xuống), tính trên subtotal (không phí ship)
 *  - Cộng khi đơn chuyển 'completed'
 *  - Trừ tương ứng khi đơn refund (không cho âm)
 *  - Membership lên hạng tự động dựa trên tổng điểm hiện tại
 */

const POINTS_PER_VND = 1 / 1000; // 1 điểm / 1000đ

const MEMBERSHIP_THRESHOLDS: Array<{
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  min: number;
}> = [
  { level: 'platinum', min: 200_000 },
  { level: 'gold', min: 50_000 },
  { level: 'silver', min: 10_000 },
  { level: 'bronze', min: 0 },
];

export const calculatePointsFromSubtotal = (subtotal: number): number => {
  if (!subtotal || subtotal <= 0) return 0;
  return Math.floor(subtotal * POINTS_PER_VND);
};

export const computeMembershipLevel = (
  totalPoints: number,
): 'bronze' | 'silver' | 'gold' | 'platinum' => {
  for (const tier of MEMBERSHIP_THRESHOLDS) {
    if (totalPoints >= tier.min) return tier.level;
  }
  return 'bronze';
};

export const getNextLevelInfo = (totalPoints: number) => {
  // Trả về ngưỡng cần đạt và còn bao nhiêu điểm để lên level kế
  for (let i = MEMBERSHIP_THRESHOLDS.length - 1; i >= 0; i--) {
    const tier = MEMBERSHIP_THRESHOLDS[i];
    if (totalPoints < tier.min) {
      return {
        nextLevel: tier.level,
        nextLevelAt: tier.min,
        pointsToNext: tier.min - totalPoints,
      };
    }
  }
  return null; // đã ở platinum
};

type Reason = 'order_completed' | 'order_refunded' | 'admin_adjust';

/**
 * Cộng/trừ điểm + cập nhật membership level + ghi log.
 * Phải gọi trong transaction để đảm bảo atomic.
 * Trả về số điểm thực sự đã thay đổi (đã clamp về >= 0 nếu trừ quá).
 */
export async function applyPointsChange(
  connection: PoolConnection,
  args: {
    userId: number;
    change: number; // có thể âm (refund) hoặc dương (earn)
    reason: Reason;
    orderId?: number;
    note?: string;
  },
): Promise<{ change: number; balanceAfter: number; newLevel: string }> {
  const { userId, change, reason, orderId, note } = args;

  // Đọc điểm hiện tại với lock
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT points FROM users WHERE user_id = ? FOR UPDATE',
    [userId],
  );
  if (rows.length === 0) {
    throw new Error(`Không tìm thấy user ${userId}`);
  }
  const currentPoints = Number(rows[0].points ?? 0);

  // Clamp để không bao giờ âm
  let actualChange = change;
  let newBalance = currentPoints + change;
  if (newBalance < 0) {
    actualChange = -currentPoints;
    newBalance = 0;
  }

  if (actualChange === 0) {
    return {
      change: 0,
      balanceAfter: currentPoints,
      newLevel: computeMembershipLevel(currentPoints),
    };
  }

  const newLevel = computeMembershipLevel(newBalance);

  await connection.execute(
    'UPDATE users SET points = ?, membership_level = ? WHERE user_id = ?',
    [newBalance, newLevel, userId],
  );

  await connection.execute(
    `INSERT INTO user_points_log (user_id, change_amount, balance_after, reason, order_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [userId, actualChange, newBalance, reason, orderId ?? null, note ?? null],
  );

  return { change: actualChange, balanceAfter: newBalance, newLevel };
}

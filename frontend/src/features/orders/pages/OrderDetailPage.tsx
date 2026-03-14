import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { orderService } from '@/services/order.service';
import { reviewService } from '@/services/review.service';
import type { OrderDetailView } from '@/types/order';
import type { OrderReviewSummaryView } from '@/types/review';
import { StarRatingInput } from '../components/StarRatingInput';
import {
  ORDER_EVENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  RESTOCK_ACTION_LABELS,
  RETURN_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  formatCurrency,
  formatDateTime,
} from '../lib/presentation';

type ReturnDraft = {
  quantity: number;
  reason: string;
};

type ProductReviewDraft = {
  rating: number;
  title: string;
  comment: string;
  open: boolean;
};

const createReturnDraftMap = (detail: OrderDetailView) =>
  detail.items.reduce<Record<number, ReturnDraft>>((acc, item) => {
    acc[item.orderDetailId] = { quantity: 0, reason: '' };
    return acc;
  }, {});

const createProductReviewDraftMap = (summary?: OrderReviewSummaryView | null) =>
  (summary?.items || []).reduce<Record<number, ProductReviewDraft>>((acc, item) => {
    acc[item.orderDetailId] = {
      rating: 5,
      title: '',
      comment: '',
      open: false,
    };
    return acc;
  }, {});

export const OrderDetailPage = () => {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const [detail, setDetail] = useState<OrderDetailView | null>(null);
  const [reviewSummary, setReviewSummary] = useState<OrderReviewSummaryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [returnDrafts, setReturnDrafts] = useState<Record<number, ReturnDraft>>({});
  const [showOrderFeedbackForm, setShowOrderFeedbackForm] = useState(false);
  const [orderFeedbackRating, setOrderFeedbackRating] = useState(5);
  const [orderFeedbackTitle, setOrderFeedbackTitle] = useState('');
  const [orderFeedbackComment, setOrderFeedbackComment] = useState('');
  const [productReviewDrafts, setProductReviewDrafts] = useState<
    Record<number, ProductReviewDraft>
  >({});

  const loadData = async () => {
    if (!Number.isFinite(orderId)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [detailResult, reviewResult] = await Promise.allSettled([
        orderService.getById(orderId),
        reviewService.getMyOrderReviewSummary(orderId),
      ]);

      if (detailResult.status === 'rejected') {
        throw detailResult.reason;
      }

      const orderDetail = detailResult.value;
      setDetail(orderDetail);
      setReturnDrafts(createReturnDraftMap(orderDetail));

      if (reviewResult.status === 'fulfilled') {
        setReviewSummary(reviewResult.value);
        setProductReviewDrafts(createProductReviewDraftMap(reviewResult.value));
      } else {
        console.error('Failed to fetch customer order reviews:', reviewResult.reason);
        setReviewSummary(null);
        setProductReviewDrafts({});
      }
    } catch (error) {
      console.error('Failed to fetch customer order detail:', error);
      toast.error('Khong the tai chi tiet don hang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [orderId]);

  const selectedReturnItems = useMemo(
    () =>
      Object.entries(returnDrafts)
        .map(([orderDetailId, draft]) => ({
          orderDetailId: Number(orderDetailId),
          quantity: draft.quantity,
          reason: draft.reason.trim() || undefined,
        }))
        .filter((item) => item.quantity > 0),
    [returnDrafts]
  );

  const handleCancelOrder = async () => {
    if (!detail || !cancelReason.trim()) {
      toast.error('Vui long nhap ly do huy don');
      return;
    }

    try {
      setSubmitting('cancel');
      await orderService.cancel(detail.order.orderId, { reason: cancelReason.trim() });
      toast.success('Da gui yeu cau huy don');
      setShowCancelForm(false);
      setCancelReason('');
      await loadData();
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      toast.error(error.response?.data?.message || 'Khong the huy don hang');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmitReturn = async () => {
    if (!detail) {
      return;
    }

    if (!returnReason.trim()) {
      toast.error('Vui long nhap ly do hoan/tra');
      return;
    }

    if (selectedReturnItems.length === 0) {
      toast.error('Vui long chon it nhat mot san pham can hoan/tra');
      return;
    }

    try {
      setSubmitting('return');
      await orderService.createReturn(detail.order.orderId, {
        reason: returnReason.trim(),
        customerNote: returnNote.trim() || undefined,
        items: selectedReturnItems,
      });
      toast.success('Da gui yeu cau hoan/tra');
      setShowReturnForm(false);
      setReturnReason('');
      setReturnNote('');
      await loadData();
    } catch (error: any) {
      console.error('Failed to create return request:', error);
      toast.error(error.response?.data?.message || 'Khong the gui yeu cau hoan/tra');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmitOrderFeedback = async () => {
    if (!detail) {
      return;
    }

    try {
      setSubmitting('order-feedback');
      await reviewService.createOrderFeedback(detail.order.orderId, {
        rating: orderFeedbackRating,
        title: orderFeedbackTitle.trim() || undefined,
        comment: orderFeedbackComment.trim() || undefined,
      });
      toast.success('Cam on ban da danh gia don hang');
      setShowOrderFeedbackForm(false);
      setOrderFeedbackTitle('');
      setOrderFeedbackComment('');
      setOrderFeedbackRating(5);
      await loadData();
    } catch (error: any) {
      console.error('Failed to submit order feedback:', error);
      toast.error(error.response?.data?.message || 'Khong the gui danh gia don hang');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmitProductReview = async (orderDetailId: number) => {
    if (!detail) {
      return;
    }

    const draft = productReviewDrafts[orderDetailId];
    if (!draft) {
      return;
    }

    try {
      setSubmitting(`product-review-${orderDetailId}`);
      await reviewService.createProductReview(detail.order.orderId, orderDetailId, {
        rating: draft.rating,
        title: draft.title.trim() || undefined,
        comment: draft.comment.trim() || undefined,
      });
      toast.success('Danh gia san pham da duoc ghi nhan');
      await loadData();
    } catch (error: any) {
      console.error('Failed to submit product review:', error);
      toast.error(error.response?.data?.message || 'Khong the gui danh gia san pham');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <div className="text-lg text-gray-500">Dang tai chi tiet don hang...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Khong tim thay don hang</h2>
        <p className="mt-2 text-sm text-gray-500">
          Don hang co the khong ton tai hoac ban khong co quyen truy cap.
        </p>
        <Link
          to="/orders"
          className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Quay lai danh sach don hang
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            Quay lai danh sach don hang
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{detail.order.orderCode}</h2>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[detail.order.status]}`}
            >
              {ORDER_STATUS_LABELS[detail.order.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Dat luc {formatDateTime(detail.order.orderDate)}. Thanh toan:{' '}
            {PAYMENT_METHOD_LABELS[detail.order.paymentMethod]} /{' '}
            {PAYMENT_STATUS_LABELS[detail.order.paymentStatus]}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Tai lai
          </button>
          {detail.order.canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelForm((previous) => !previous)}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Huy don
            </button>
          )}
          {detail.order.canRequestReturn && (
            <button
              type="button"
              onClick={() => setShowReturnForm((previous) => !previous)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Gui yeu cau hoan/tra
            </button>
          )}
        </div>
      </div>

      {showCancelForm && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="text-lg font-semibold text-rose-900">Yeu cau huy don</h3>
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={4}
            placeholder="Nhap ly do huy don..."
            className="mt-4 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={submitting === 'cancel'}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Xac nhan huy don
            </button>
            <button
              type="button"
              onClick={() => setShowCancelForm(false)}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-900"
            >
              Dong
            </button>
          </div>
        </div>
      )}

      {showReturnForm && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-lg font-semibold text-sky-900">Yeu cau hoan/tra hang</h3>
          <div className="mt-4 space-y-4">
            <textarea
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              rows={3}
              placeholder="Mo ta ly do can hoan/tra..."
              className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
            />

            <textarea
              value={returnNote}
              onChange={(event) => setReturnNote(event.target.value)}
              rows={2}
              placeholder="Thong tin bo sung neu can..."
              className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
            />

            <div className="space-y-3">
              {detail.items.map((item) => (
                <div
                  key={item.orderDetailId}
                  className="rounded-2xl border border-sky-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.variantName || item.sku || `San pham #${item.productId}`}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">Da mua: {item.quantity}</p>
                    </div>

                    <div className="grid gap-3 md:w-[320px]">
                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={returnDrafts[item.orderDetailId]?.quantity ?? 0}
                        onChange={(event) =>
                          setReturnDrafts((previous) => ({
                            ...previous,
                            [item.orderDetailId]: {
                              ...previous[item.orderDetailId],
                              quantity: Math.max(
                                0,
                                Math.min(item.quantity, Number(event.target.value) || 0)
                              ),
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={returnDrafts[item.orderDetailId]?.reason ?? ''}
                        onChange={(event) =>
                          setReturnDrafts((previous) => ({
                            ...previous,
                            [item.orderDetailId]: {
                              ...previous[item.orderDetailId],
                              reason: event.target.value,
                            },
                          }))
                        }
                        placeholder="Ly do rieng cho san pham nay"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={submitting === 'return'}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Gui yeu cau
              </button>
              <button
                type="button"
                onClick={() => setShowReturnForm(false)}
                className="rounded-lg border border-sky-200 px-4 py-2 text-sm font-medium text-sky-950"
              >
                Dong
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">San pham trong don</h3>
              <p className="text-sm font-semibold text-gray-900">
                Tong cong {formatCurrency(detail.order.total)}
              </p>
            </div>
            <div className="mt-5 space-y-4">
              {detail.items.map((item) => (
                <div
                  key={item.orderDetailId}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.productImage || '/placeholder.jpg'}
                      alt={item.productName}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.variantName || item.sku || `San pham #${item.productId}`}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">So luong: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Don gia {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Lich su xu ly</h3>
            <div className="mt-5 space-y-4">
              {detail.timeline.map((event) => (
                <div key={event.orderEventId} className="flex gap-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-slate-900" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {ORDER_EVENT_LABELS[event.eventType] || event.eventType}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{formatDateTime(event.createdAt)}</p>
                    {(event.note || event.fromStatus || event.toStatus) && (
                      <p className="mt-1 text-sm text-gray-600">
                        {event.note ||
                          [event.fromStatus, event.toStatus].filter(Boolean).join(' -> ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Hoan/tra hang</h3>
            <div className="mt-5 space-y-4">
              {detail.returns.length === 0 ? (
                <p className="text-sm text-gray-500">Chua co yeu cau hoan/tra nao.</p>
              ) : (
                detail.returns.map((orderReturn) => (
                  <div
                    key={orderReturn.orderReturnId}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{orderReturn.requestCode}</p>
                        <p className="text-sm text-gray-500">
                          Gui luc {formatDateTime(orderReturn.requestedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {RETURN_STATUS_LABELS[orderReturn.status]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Ly do:</span> {orderReturn.reason}
                    </p>
                    <div className="mt-3 space-y-2">
                      {orderReturn.items.map((item) => (
                        <div
                          key={item.orderReturnItemId}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                        >
                          <p className="font-medium text-gray-900">
                            {item.productName || `San pham #${item.productId}`}
                          </p>
                          <p className="mt-1">
                            So luong: {item.quantity} | {RESTOCK_ACTION_LABELS[item.restockAction]}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{item.reason || 'Khong co ghi chu'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {reviewSummary && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Danh gia sau mua hang</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Gop y cho don hang va tung san pham trong don.
                  </p>
                </div>
                {reviewSummary.canReviewOrder && (
                  <button
                    type="button"
                    onClick={() => setShowOrderFeedbackForm((previous) => !previous)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Danh gia don hang
                  </button>
                )}
              </div>

              {reviewSummary.orderFeedback && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-medium text-emerald-900">
                    Ban da danh gia don hang {reviewSummary.orderFeedback.rating}/5
                  </p>
                  <p className="mt-1 text-sm text-emerald-900">
                    {reviewSummary.orderFeedback.title || 'Khong co tieu de'}
                  </p>
                  <p className="mt-2 text-sm text-emerald-800">
                    {reviewSummary.orderFeedback.comment || 'Khong co noi dung bo sung'}
                  </p>
                </div>
              )}

              {showOrderFeedbackForm && reviewSummary.canReviewOrder && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-gray-900">Danh gia trai nghiem don hang</p>
                  <div className="mt-3">
                    <StarRatingInput
                      value={orderFeedbackRating}
                      onChange={setOrderFeedbackRating}
                      disabled={submitting === 'order-feedback'}
                    />
                  </div>
                  <input
                    type="text"
                    value={orderFeedbackTitle}
                    onChange={(event) => setOrderFeedbackTitle(event.target.value)}
                    placeholder="Tieu de ngan (tuy chon)"
                    className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                  <textarea
                    value={orderFeedbackComment}
                    onChange={(event) => setOrderFeedbackComment(event.target.value)}
                    rows={3}
                    placeholder="Chia se trai nghiem cua ban..."
                    className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={handleSubmitOrderFeedback}
                      disabled={submitting === 'order-feedback'}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Gui danh gia
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOrderFeedbackForm(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                    >
                      Dong
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-4">
                {reviewSummary.items.map((item) => {
                  const draft = productReviewDrafts[item.orderDetailId];
                  const isSubmittingReview = submitting === `product-review-${item.orderDetailId}`;

                  return (
                    <div
                      key={item.orderDetailId}
                      className="rounded-2xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {item.variantName || item.sku || `San pham #${item.productId}`}
                          </p>
                        </div>

                        {item.review ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {REVIEW_STATUS_LABELS[item.review.status]}
                          </span>
                        ) : item.canReview ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProductReviewDrafts((previous) => ({
                                ...previous,
                                [item.orderDetailId]: {
                                  ...previous[item.orderDetailId],
                                  open: !previous[item.orderDetailId]?.open,
                                },
                              }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
                          >
                            {draft?.open ? 'Dong form danh gia' : 'Danh gia san pham'}
                          </button>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            Chua du dieu kien danh gia
                          </span>
                        )}
                      </div>

                      {item.review && (
                        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                          <p className="font-medium text-gray-900">{item.review.rating}/5 sao</p>
                          <p className="mt-1 text-sm text-gray-700">
                            {item.review.title || 'Khong co tieu de'}
                          </p>
                          <p className="mt-2 text-sm text-gray-600">
                            {item.review.comment || 'Khong co noi dung bo sung'}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">
                            Gui luc {formatDateTime(item.review.createdAt)}
                          </p>
                        </div>
                      )}

                      {!item.review && item.canReview && draft?.open && (
                        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                          <StarRatingInput
                            value={draft.rating}
                            onChange={(rating) =>
                              setProductReviewDrafts((previous) => ({
                                ...previous,
                                [item.orderDetailId]: {
                                  ...previous[item.orderDetailId],
                                  rating,
                                },
                              }))
                            }
                            disabled={isSubmittingReview}
                          />
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(event) =>
                              setProductReviewDrafts((previous) => ({
                                ...previous,
                                [item.orderDetailId]: {
                                  ...previous[item.orderDetailId],
                                  title: event.target.value,
                                },
                              }))
                            }
                            placeholder="Tieu de ngan (tuy chon)"
                            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          />
                          <textarea
                            value={draft.comment}
                            onChange={(event) =>
                              setProductReviewDrafts((previous) => ({
                                ...previous,
                                [item.orderDetailId]: {
                                  ...previous[item.orderDetailId],
                                  comment: event.target.value,
                                },
                              }))
                            }
                            rows={3}
                            placeholder="Cam nhan cua ban ve san pham..."
                            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          />
                          <div className="mt-3 flex gap-3">
                            <button
                              type="button"
                              onClick={() => void handleSubmitProductReview(item.orderDetailId)}
                              disabled={isSubmittingReview}
                              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                              Gui danh gia
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setProductReviewDrafts((previous) => ({
                                  ...previous,
                                  [item.orderDetailId]: {
                                    ...previous[item.orderDetailId],
                                    open: false,
                                  },
                                }))
                              }
                              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                            >
                              Dong
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Thong tin giao hang</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Nguoi nhan:</span>{' '}
                {detail.order.shipping.name}
              </p>
              <p>
                <span className="font-medium text-gray-900">So dien thoai:</span>{' '}
                {detail.order.shipping.phone}
              </p>
              <p>
                <span className="font-medium text-gray-900">Dia chi:</span>{' '}
                {detail.order.shipping.fullAddress}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Tong ket thanh toan</h3>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Tam tinh</span>
                <span>{formatCurrency(detail.order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Phi van chuyen</span>
                <span>{formatCurrency(detail.order.shippingFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Giam gia</span>
                <span>- {formatCurrency(detail.order.discountAmount)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                <div className="flex items-center justify-between">
                  <span>Tong cong</span>
                  <span>{formatCurrency(detail.order.total)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Ghi chu</h3>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Ghi chu cua ban:</span>{' '}
                {detail.order.customerNote || 'Khong co'}
              </p>
              <p>
                <span className="font-medium text-gray-900">Ly do huy:</span>{' '}
                {detail.order.cancelReason || 'Khong co'}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

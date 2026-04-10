import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { addressService, type Address } from "@/services/address.service";
import { locationService, type VietnamProvince, type VietnamWard } from "@/services/location.service";
import { resolveProvinceByCityName, resolveWardByName } from "@/features/locations/lib/vietnamLocation";

export interface DeliveryForm {
  customerEmail: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingWard: string;
  shippingDistrict: string;
  shippingCity: string;
  customerNote: string;
}

export const useCheckoutAddress = (user: any, isAuthenticated: boolean) => {
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [provinces, setProvinces] = useState<VietnamProvince[]>([]);
  const [wards, setWards] = useState<VietnamWard[]>([]);
  
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedWardCode, setSelectedWardCode] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Biến cờ để đảm bảo chỉ tự động set địa chỉ 1 lần lúc mới vào trang
  const [hasAutoApplied, setHasAutoApplied] = useState(false);

  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({
    customerEmail: user?.email || "",
    shippingName: user?.fullName || "",
    shippingPhone: user?.phone || "",
    shippingAddress: "",
    shippingWard: "",
    shippingDistrict: "",
    shippingCity: "",
    customerNote: "",
  });

  // 1. ĐỘC LẬP: Tải danh sách Tỉnh / Thành phố
  useEffect(() => {
    let cancelled = false;
    const fetchProvinces = async () => {
      try {
        setLoadingProvinces(true);
        const data = await locationService.getProvinces();
        if (!cancelled) setProvinces(data);
      } catch (error) {
        if (!cancelled) setLocationError("Không thể tải danh sách tỉnh/thành phố");
      } finally {
        if (!cancelled) setLoadingProvinces(false);
      }
    };
    void fetchProvinces();
    return () => { cancelled = true; };
  }, []);

  // 2. ĐỘC LẬP: Tải danh sách địa chỉ đã lưu (Sửa lỗi ở đây, gọi ngay lập tức)
  useEffect(() => {
    if (!isAuthenticated) {
      setSavedAddresses([]);
      return;
    }

    addressService.getMyAddresses()
      .then(addrs => {
        setSavedAddresses(addrs); // Có data phát là nhét vào Modal ngay
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    setDeliveryForm((prev) => ({
      ...prev,
      customerEmail: user?.email || prev.customerEmail,
      shippingName: user?.fullName || prev.shippingName,
      shippingPhone: user?.phone || prev.shippingPhone,
    }));
  }, [user?.email, user?.fullName, user?.phone]);

  // 3. Tự động áp dụng địa chỉ mặc định khi CẢ 2 dữ liệu trên đã tải xong
  useEffect(() => {
    if (savedAddresses.length > 0 && provinces.length > 0 && !hasAutoApplied) {
      const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      applySavedAddress(defaultAddress, false); // false = ẩn thông báo vàng
      setHasAutoApplied(true); // Đánh dấu là đã tự động set rồi, không chạy lại nữa
    }
  }, [savedAddresses, provinces, hasAutoApplied]);

  const loadWardsForProvince = async (provinceCode: string) => {
    if (!provinceCode) {
      setWards([]);
      return [] as VietnamWard[];
    }
    try {
      setLoadingWards(true);
      setLocationError(null);
      const data = await locationService.getWardsByProvince(provinceCode);
      setWards(data);
      return data;
    } catch (error) {
      setWards([]);
      setLocationError("Không thể tải phường/xã");
      return [] as VietnamWard[];
    } finally {
      setLoadingWards(false);
    }
  };

  const applySavedAddress = async (address: Address, isManualSelect = true) => {
    setDeliveryForm((prev) => ({
      ...prev,
      shippingName: address.fullName,
      shippingPhone: address.phone,
      shippingAddress: address.addressLine,
      shippingDistrict: address.district || "",
    }));

    const matchedProvince = resolveProvinceByCityName(provinces, address.city);
    if (!matchedProvince) {
      setSelectedProvinceCode("");
      setSelectedWardCode("");
      setWards([]);
      setDeliveryForm(prev => ({ ...prev, shippingWard: "", shippingCity: "" }));
      if (isManualSelect) toast("Địa chỉ cũ chưa khớp dữ liệu mới, vui lòng cập nhật lại", { icon: "⚠️" });
      return;
    }

    setSelectedProvinceCode(matchedProvince.code);
    setDeliveryForm(prev => ({ ...prev, shippingCity: matchedProvince.name, shippingWard: "" }));

    const nextWards = await loadWardsForProvince(matchedProvince.code);
    const matchedWard = resolveWardByName(nextWards, address.ward);

    if (!matchedWard) {
      setSelectedWardCode("");
      setDeliveryForm(prev => ({ ...prev, shippingWard: "" }));
      if (isManualSelect) toast("Vui lòng chọn lại phường/xã cho địa chỉ này", { icon: "⚠️" });
      return;
    }

    setSelectedWardCode(matchedWard.code);
    setDeliveryForm(prev => ({
      ...prev,
      shippingWard: matchedWard.name,
      shippingCity: matchedProvince.name,
    }));
    
    if (isManualSelect) toast.success("Đã áp dụng địa chỉ");
  };

  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvinceCode(provinceCode);
    setSelectedWardCode("");
    const province = provinces.find((item) => item.code === provinceCode);
    setDeliveryForm((prev) => ({
      ...prev,
      shippingCity: province?.name || "",
      shippingWard: "",
      shippingDistrict: "",
    }));
    await loadWardsForProvince(provinceCode);
  };

  const handleWardChange = (wardCode: string) => {
    setSelectedWardCode(wardCode);
    const ward = wards.find((item) => item.code === wardCode);
    setDeliveryForm((prev) => ({ ...prev, shippingWard: ward?.name || "" }));
  };

  const updateForm = (field: keyof Omit<DeliveryForm, 'customerNote'>, value: string) => {
    setDeliveryForm(prev => ({ ...prev, [field]: value }));
  };

  const updateNote = (note: string) => {
     setDeliveryForm(prev => ({ ...prev, customerNote: note }));
  }

  const isLocationSelected = Boolean(
    selectedProvinceCode && selectedWardCode && deliveryForm.shippingCity && deliveryForm.shippingWard
  );

  return {
    deliveryForm,
    updateForm,
    updateNote,
    savedAddresses,
    applySavedAddress,
    provinces,
    wards,
    selectedProvinceCode,
    selectedWardCode,
    loadingProvinces,
    loadingWards,
    locationError,
    handleProvinceChange,
    handleWardChange,
    isLocationSelected
  };
};

import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-white text-xl font-black uppercase italic tracking-tighter mb-4">TechMart</h3>
            <p className="text-sm mb-5 leading-relaxed text-gray-400">
              Chuyên cung cấp điện thoại di động chính hãng, giá tốt nhất thị trường.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="bg-gray-800 hover:bg-blue-600 p-2.5 rounded-xl transition-all duration-300">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="bg-gray-800 hover:bg-pink-600 p-2.5 rounded-xl transition-all duration-300">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="bg-gray-800 hover:bg-red-600 p-2.5 rounded-xl transition-all duration-300">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Liên kết</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">Giới thiệu</Link></li>
              <li><Link to="/products" className="text-gray-400 hover:text-white transition-colors">Sản phẩm</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Liên hệ</Link></li>
              <li><Link to="/policy" className="text-gray-400 hover:text-white transition-colors">Chính sách bảo hành</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Hỗ trợ khách hàng</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/shipping" className="text-gray-400 hover:text-white transition-colors">Chính sách giao hàng</Link></li>
              <li><Link to="/return" className="text-gray-400 hover:text-white transition-colors">Đổi trả & Hoàn tiền</Link></li>
              <li><Link to="/payment" className="text-gray-400 hover:text-white transition-colors">Phương thức thanh toán</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white transition-colors">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
                <span className="text-gray-400">123 Đường ABC, Quận 1, TP.HCM</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="text-gray-400">1900 xxxx</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="text-gray-400">support@techmart.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-6 text-center">
          <p className="text-xs text-gray-500">&copy; 2026 TechMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

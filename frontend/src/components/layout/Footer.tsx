import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">TechMart</h3>
            <p className="text-sm mb-4">
              Chuyên cung cấp điện thoại di động chính hãng, giá tốt nhất thị trường.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-primary-400">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-primary-400">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-primary-400">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Liên kết</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-primary-400">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-primary-400">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary-400">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link to="/policy" className="hover:text-primary-400">
                  Chính sách bảo hành
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Hỗ trợ khách hàng</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shipping" className="hover:text-primary-400">
                  Chính sách giao hàng
                </Link>
              </li>
              <li>
                <Link to="/return" className="hover:text-primary-400">
                  Đổi trả & Hoàn tiền
                </Link>
              </li>
              <li>
                <Link to="/payment" className="hover:text-primary-400">
                  Phương thức thanh toán
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary-400">
                  Câu hỏi thường gặp
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>123 Đường ABC, Quận 1, TP.HCM</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                <span>1900 xxxx</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                <span>support@techmart.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2026 TechMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

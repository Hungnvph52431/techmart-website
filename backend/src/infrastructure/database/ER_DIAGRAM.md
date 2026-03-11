-- ==================================================
-- MOBILE SHOP - ER DIAGRAM (Mermaid Format)
-- Sơ đồ quan hệ thực thể
-- ==================================================

```mermaid
erDiagram
    users ||--o{ addresses : "has"
    users ||--o{ orders : "places"
    users ||--o{ cart : "has"
    users ||--o{ reviews : "writes"
    users ||--o{ wishlists : "saves"
    users ||--o{ product_views : "views"
    users ||--o{ notifications : "receives"
    users ||--o{ support_tickets : "creates"
    
    brands ||--o{ products : "manufactures"
    categories ||--o{ categories : "contains"
    categories ||--o{ products : "contains"
    
    products ||--o{ product_variants : "has"
    products ||--o{ product_images : "has"
    products ||--o{ reviews : "receives"
    products ||--o{ cart : "contains"
    products ||--o{ order_details : "ordered_in"
    products ||--o{ wishlists : "saved_in"
    products ||--o{ product_views : "tracked_in"
    products ||--o{ inventory_transactions : "tracked"
    products ||--o{ promotion_products : "promoted_in"
    
    product_variants ||--o{ cart : "selected"
    product_variants ||--o{ order_details : "selected"
    
    orders ||--o{ order_details : "contains"
    orders ||--o| coupons : "uses"
    orders ||--o{ reviews : "reviewed_after"
    orders ||--o{ support_tickets : "relates_to"
    
    promotions ||--o{ promotion_products : "applies_to"
    
    users {
        int user_id PK
        varchar email UK
        varchar password
        varchar name
        varchar phone
        enum role
        enum status
        int points
        enum membership_level
    }
    
    addresses {
        int address_id PK
        int user_id FK
        varchar full_name
        varchar phone
        varchar address_line
        varchar ward
        varchar district
        varchar city
        boolean is_default
    }
    
    brands {
        int brand_id PK
        varchar name
        varchar slug UK
        varchar logo_url
        boolean is_active
    }
    
    categories {
        int category_id PK
        varchar name
        varchar slug UK
        int parent_id FK
        int display_order
        boolean is_active
    }
    
    products {
        int product_id PK
        varchar name
        varchar slug UK
        varchar sku UK
        int category_id FK
        int brand_id FK
        decimal price
        decimal sale_price
        json specifications
        int stock_quantity
        int sold_quantity
        decimal rating_avg
        boolean is_featured
        boolean is_new
        boolean is_bestseller
        enum status
    }
    
    product_variants {
        int variant_id PK
        int product_id FK
        varchar variant_name
        varchar sku UK
        json attributes
        decimal price_adjustment
        int stock_quantity
    }
    
    product_images {
        int image_id PK
        int product_id FK
        varchar image_url
        int display_order
        boolean is_primary
    }
    
    reviews {
        int review_id PK
        int product_id FK
        int user_id FK
        int order_id FK
        int rating
        varchar title
        text comment
        boolean is_verified_purchase
        enum status
    }
    
    coupons {
        int coupon_id PK
        varchar code UK
        enum discount_type
        decimal discount_value
        decimal min_order_value
        int usage_limit
        int per_user_limit
        timestamp valid_from
        timestamp valid_to
    }
    
    cart {
        int cart_id PK
        int user_id FK
        int product_id FK
        int variant_id FK
        int quantity
        decimal price
    }
    
    orders {
        int order_id PK
        varchar order_code UK
        int user_id FK
        varchar shipping_name
        varchar shipping_phone
        varchar shipping_address
        decimal subtotal
        decimal shipping_fee
        decimal discount_amount
        decimal total
        int coupon_id FK
        enum payment_method
        enum payment_status
        enum status
    }
    
    order_details {
        int order_detail_id PK
        int order_id FK
        int product_id FK
        int variant_id FK
        varchar product_name
        decimal price
        int quantity
        decimal subtotal
    }
    
    promotions {
        int promotion_id PK
        varchar name
        enum promotion_type
        enum discount_type
        decimal discount_value
        enum applicable_to
        timestamp valid_from
        timestamp valid_to
    }
    
    promotion_products {
        int id PK
        int promotion_id FK
        int product_id FK
    }
    
    wishlists {
        int wishlist_id PK
        int user_id FK
        int product_id FK
    }
    
    support_tickets {
        int ticket_id PK
        int user_id FK
        int order_id FK
        varchar subject
        enum type
        enum status
        enum priority
    }
```

---

## Giải thích quan hệ:

### 1-n (One to Many):
- Một user có nhiều addresses, orders, cart items, reviews
- Một product có nhiều variants, images, reviews
- Một order có nhiều order_details
- Một category có thể chứa nhiều categories con (self-reference)

### n-n (Many to Many):
- products và promotions (thông qua promotion_products)

### Optional (có thể null):
- order có thể có hoặc không có coupon
- product có thể có hoặc không có brand
- review có thể liên kết với order (nếu verified purchase)

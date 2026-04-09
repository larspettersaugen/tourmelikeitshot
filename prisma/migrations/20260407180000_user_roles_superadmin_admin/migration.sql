-- Platform / dev: former `admin` → `superadmin`. Booking-firm staff: former `editor` → `admin`.
UPDATE "User" SET role = 'superadmin' WHERE role = 'admin';
UPDATE "User" SET role = 'admin' WHERE role = 'editor';

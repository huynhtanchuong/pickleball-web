-- Insert demo members for testing
INSERT INTO members (name, tier, phone, email, notes) VALUES
  ('Nguyễn Văn A', 1, '0901234567', 'nguyenvana@example.com', 'Thành viên T1 - Kỹ năng cao'),
  ('Trần Thị B', 1, '0901234568', 'tranthib@example.com', 'Thành viên T1 - Kinh nghiệm lâu năm'),
  ('Lê Văn C', 2, '0901234569', 'levanc@example.com', 'Thành viên T2 - Trung bình khá'),
  ('Phạm Thị D', 2, '0901234570', 'phamthid@example.com', 'Thành viên T2 - Đang tiến bộ'),
  ('Hoàng Văn E', 2, '0901234571', 'hoangvane@example.com', 'Thành viên T2 - Ổn định'),
  ('Võ Thị F', 3, '0901234572', 'vothif@example.com', 'Thành viên T3 - Mới bắt đầu'),
  ('Đặng Văn G', 3, '0901234573', 'dangvang@example.com', 'Thành viên T3 - Đang học'),
  ('Bùi Thị H', 3, '0901234574', 'buithih@example.com', 'Thành viên T3 - Nhiệt tình'),
  ('Đinh Văn I', 1, '0901234575', 'dinhvani@example.com', 'Thành viên T1 - Chơi tốt'),
  ('Mai Thị K', 2, '0901234576', 'maithik@example.com', 'Thành viên T2 - Khá ổn'),
  ('Dương Văn L', 3, '0901234577', 'duongvanl@example.com', 'Thành viên T3 - Cần luyện tập'),
  ('Lý Thị M', 1, '0901234578', 'lythim@example.com', 'Thành viên T1 - Xuất sắc')
ON CONFLICT (id) DO NOTHING;

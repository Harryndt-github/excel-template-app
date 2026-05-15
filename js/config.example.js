// Copy file này thành config.js và điền thông tin Supabase của dự án.
// File config.js KHÔNG được commit lên git.
window.UAT_SUPABASE_CONFIG = {
  url: '',        // VD: https://abcdefghij.supabase.co
  key: '',        // anon/publishable key từ Supabase > Settings > API
  scope: 'uat',   // tên workspace/môi trường, dùng để phân biệt dữ liệu
  bucket: 'uat-templates', // tên Storage bucket chứa file DOCX template
};

import axios from "axios";

const backendBaseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Tạo instance riêng
const axiosClient = axios.create({
  baseURL: backendBaseURL,
  withCredentials: true,
});

// Thêm interceptor để gắn accessToken vào mọi request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Xử lý response + refresh token nếu accessToken hết hạn
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Các endpoint đăng nhập/đăng ký tự trả 401 có ý nghĩa (sai mật khẩu...): không refresh, để trang tự hiện lỗi.
    const isAuthEndpoint = /\/api\/auth\/(login|register|verify-otp|forgot-password|reset-password|verify-email|token)\b/.test(originalRequest?.url || "");

    // Nếu lỗi là 401 (token hết hạn) và chưa thử refresh
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        // Gọi API refresh token
        const res = await axios.post(`${backendBaseURL}/api/auth/token`, {
          refreshToken,
        });

        // backend trả cả snake_case và camelCase; chấp nhận cả hai và không bao giờ lưu "undefined"
        const newAccessToken = res.data.accessToken || res.data.access_token;
        const newRefreshToken = res.data.refreshToken || res.data.refresh_token;
        if (!newAccessToken || !newRefreshToken) throw new Error("Refresh response has no tokens");

        // Lưu lại
        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        // Gắn accessToken mới và gửi lại request ban đầu
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (err) {
        console.error("Refresh token failed", err);
        // Nếu refresh cũng fail => logout
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

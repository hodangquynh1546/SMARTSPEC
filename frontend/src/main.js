import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css'; // Đảm bảo import CSS của toast
import './assets/theme.css'; // token WorkHub (đặt sau CSS toast để ghi đè)
import './assets/polish.css'; // chuẩn hoá thành phần dùng chung giữa các view


const app = createApp(App);

// Thiết lập Pinia
app.use(createPinia());

// Thiết lập Vue Router
app.use(router);

// Thiết lập Vue Toastification
const toastOptions = {
    // Tùy chọn tùy chỉnh nếu cần
    position: "top-right",
    timeout: 2000,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
};

app.use(Toast, toastOptions);

// Mount ứng dụng
app.mount('#app');
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // ألوان الهوية — مأخوذة من الـ mockups بتاعتك (dark + indigo)
      colors: {
        ink: {
          950: "#0A0E17", // أغمق خلفية (body)
          900: "#0F1420", // خلفية الأقسام
          800: "#161C2C", // الكروت
          700: "#1F2739", // borders / hover
        },
        brand: {
          400: "#8B7CFF",
          500: "#6C5CE7", // اللون الأساسي (الأزرار)
          600: "#5A4BD1",
        },
        mist: {
          100: "#EDEFF7", // نص أساسي
          400: "#9AA3B8", // نص ثانوي
          600: "#5C6478", // نص خافت
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

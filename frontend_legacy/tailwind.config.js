/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {
                sidebar: {
                    bg: "#0b1221", // Darker premium bg
                    hover: "#ffffff0d", // White/5
                    active: "#ffffff1a", // White/10
                    text: "#94a3b8", // Slate-400
                    "text-active": "#ffffff",
                },
                main: {
                    bg: "#0b1221",
                },
                primary: {
                    DEFAULT: "#10b981", // Emerald-500
                    hover: "#059669",
                },
            },
            fontFamily: {
                sans: ['"Manrope"', 'system-ui', 'sans-serif'],
                display: ['"Fraunces"', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [
        require('tailwind-scrollbar'),
    ],
}

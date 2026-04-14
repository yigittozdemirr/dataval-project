/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#12120C",
                card: "#1C1C14",
                accent: "#D4F03D",
                error: "#FF5555",
                border: "rgba(255, 255, 255, 0.05)",
            },
            fontFamily: {
                interface: ["Inter", "sans-serif"],
                data: ["JetBrains Mono", "monospace"],
            },
            borderRadius: {
                '2xl': '1rem',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}

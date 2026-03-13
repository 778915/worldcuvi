import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { UIProvider } from '@/components/UIProvider'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import Footer from '@/components/Footer'
import GlobalSearchDock from '@/components/GlobalSearchDock'
import CustomQuickMenu from '@/components/CustomQuickMenu'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WorldCuvi.world | 유튜브 영상 이상형 월드컵 플랫폼',
  description: '최신 유튜브 영상을 활용해 즐기는 실시간 이상형 월드컵. 다양한 테마의 랭킹에 참여하고 나만의 토너먼트를 전 세계와 공유해보세요.',
  keywords: [
    '이상형월드컵',
    '유튜브월드컵',
    '영상월드컵',
    '아이돌월드컵',
    '노래월드컵',
    '커버곡순위',
    '실시간랭킹',
    'VS놀이',
    '심심풀이게임'
  ],
  openGraph: {
    title: 'WorldCuvi - 전 세계가 함께하는 랭킹 월드컵',
    description: '가장 핫한 영상을 월드컵으로 즐겨보세요. 월드커비.world',
    url: 'https://worldcuvi.world',
    siteName: 'WorldCuvi',
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme1 = localStorage.getItem('worldcuvi-skin-primary-hex') || localStorage.getItem('accent1') || '#a855f7';
                  const theme2 = localStorage.getItem('worldcuvi-skin-text-hex') || localStorage.getItem('accent2') || '#9333ea';
                  document.documentElement.style.setProperty('--accent-1', theme1);
                  document.documentElement.style.setProperty('--accent-primary', theme1);
                  document.documentElement.style.setProperty('--accent-2', theme2);
                  document.documentElement.style.setProperty('--accent-text', theme2);
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Adsterra Popunder Script (Production Only) */}
        {process.env.NODE_ENV === 'production' && (
          <script src="https://pl28905487.effectivegatecpm.com/da/2c/c8/da2cc85d141f9144e72f86860df06c50.js" async />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white min-h-screen transition-colors duration-200`}
      >
        <ThemeProvider>
          <AuthProvider>
            <UIProvider>
              <Header />
              <LoginModal />
              <main className="pt-16 min-h-[calc(100vh-4rem)] bg-background flex flex-col">{children}</main>
              <Footer />
              <GlobalSearchDock />
              <CustomQuickMenu />
            </UIProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

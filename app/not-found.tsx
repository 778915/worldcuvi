import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
        404
      </p>
      <h2 className="text-2xl font-bold text-white">페이지를 찾을 수 없어요</h2>
      <p className="text-gray-500">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <Link
        href="/"
        className="mt-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}

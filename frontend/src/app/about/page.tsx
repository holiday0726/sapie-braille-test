import Header from '@/components/Header'

export default function About() {
  return (
    <>
      <Header />
      <div className="container">
        <div className="card" role="main">
          <h1 className="text-3xl font-bold mb-6 text-dark-100 text-center tracking-tight">
            Sapie Braille 소개
          </h1>
          
          <div className="text-base leading-relaxed text-dark-400">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-dark-100">
                프로젝트 개요
              </h2>
              <p>
                Sapie Braille은 시각장애인을 위한 통합 AI 솔루션입니다. 
                음성 입력(Whisper) → AI 처리(LLM) → 응답 생성의 흐름으로 
                시각장애인이 자연스럽게 AI와 대화할 수 있는 환경을 제공합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-dark-100">
                시스템 아키텍처
              </h2>
              <p className="mb-4">
                시각장애인 중심의 음성 기반 AI 시스템:
              </p>
              <ul className="pl-6 mb-4 space-y-2">
                <li>🎤 <strong>음성 입력</strong>: 마이크를 통한 자연스러운 음성 입력</li>
                <li>🔤 <strong>Whisper API</strong>: 음성을 정확한 텍스트로 변환</li>
                <li>🤖 <strong>LLM 처리</strong>: langGraph 기반 지능적인 응답 생성</li>
                <li>🔊 <strong>음성 응답</strong>: TTS를 통한 자연스러운 음성 출력</li>
                <li>♿ <strong>접근성</strong>: 스크린 리더 및 키보드 내비게이션 지원</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-dark-100">
                주요 기능
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                  <h3 className="text-lg font-semibold mb-2 text-dark-100">🎤 음성 인식</h3>
                  <p className="text-sm text-dark-400">Whisper API를 통한 정확한 음성-텍스트 변환</p>
                </div>
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                  <h3 className="text-lg font-semibold mb-2 text-dark-100">🤖 AI 챗봇</h3>
                  <p className="text-sm text-dark-400">langGraph 기반 지능적인 대화형 AI</p>
                </div>
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                  <h3 className="text-lg font-semibold mb-2 text-dark-100">🔊 음성 출력</h3>
                  <p className="text-sm text-dark-400">자연스러운 TTS 기반 음성 응답</p>
                </div>
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                  <h3 className="text-lg font-semibold mb-2 text-dark-100">♿ 접근성 우선</h3>
                  <p className="text-sm text-dark-400">시각장애인을 위한 완전한 접근성 지원</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-dark-100">
                기술 스택
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  'Python', 'langGraph', 'Whisper API', 'OpenAI LLM', 
                  'Next.js', 'React', 'TypeScript', 'Tailwind CSS'
                ].map((tech) => (
                  <span 
                    key={tech}
                    className="bg-primary-500 text-white py-1.5 px-3 rounded-2xl text-xs font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

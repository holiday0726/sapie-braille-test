// import React, { useEffect } from 'react';
// import { AgentType } from '@/hooks/useAgentSelection';

// interface WelcomeScreenProps {
//   micPermissionGranted?: boolean | null;
//   username?: string;
//   selectedAgentId: number;
//   isAgentSelected: boolean;
//   onAgentSelect: (agentId: number) => void;
//   agents: Record<number, AgentType>;
// }

// export const WelcomeScreen = ({ 
//   micPermissionGranted, 
//   username, 
//   selectedAgentId, 
//   isAgentSelected, 
//   onAgentSelect, 
//   agents 
// }: WelcomeScreenProps) => {

//   const handleAgentClick = (agentId: number) => {
//     // 입력 검증
//     if (typeof agentId !== 'number' || agentId < 0) {
//       console.error('Invalid agentId in handleAgentClick:', agentId);
//       return;
//     }

//     // 에이전트 존재 여부 확인
//     if (!(agentId in agents)) {
//       console.error('Agent not found:', agentId);
//       return;
//     }

//     try {
//       onAgentSelect(agentId);
//     } catch (error) {
//       console.error('Error selecting agent:', error);
//     }
//   };
//   return (
//     <div id="welcome-main" className="welcome-screen" role="main" aria-label="시각장애인을 위한 AI 어시스턴트 홈">
//       <p className="welcome-title text-5xl font-bold mb-10" role="heading" aria-level={1}>
//         {/* 안녕하세요, {username || 'Hyeonchan'} */}
//         안녕하세요, {'Sapie'}
//       </p>
//       <p className="welcome-subtitle text-2xl" role="text">
//         시각장애인을 위한 Sapie-Braille입니다. <br />음성으로 말씀하시거나 텍스트로 입력하세요.
//       </p>
//       <div className="mt-1 mb-20" role="region" aria-labelledby="keyboard-shortcuts">
//         <h2 id="keyboard-shortcuts" className="sr-only">키보드 단축키 안내</h2>
//         <div className="space-y-3" role="list" aria-label="사용 가능한 키보드 단축키 목록">
//           <div className="text-primary-400 text-lg font-semibold" role="listitem">
//             <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mr-2" aria-label="스페이스 키">space</kbd>
//             <span aria-hidden="true">+</span>
//             <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mx-2" aria-label="스페이스 키">space</kbd>
//             <span className="ml-2">음성 녹음 시작/종료</span>
//           </div>
//           <div className="text-primary-400 text-lg font-semibold" role="listitem">
//             <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mr-2" aria-label="컨트롤 키">Ctrl</kbd>
//             <span aria-hidden="true">+</span>
//             <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mx-2" aria-label="O 키">O</kbd>
//             <span className="ml-2">파일 탐색기 실행</span>
//           </div>
//           <div className="text-primary-400 text-lg font-semibold" role="listitem">
//             <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mr-2" aria-label="컨트롤 키">Ctrl</kbd>
//             <span aria-hidden="true">+</span>
//             <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mx-2" aria-label="R 키">R</kbd>
//             <span className="ml-2">텍스트 음성 재생</span>
//           </div>
//         </div>
//       </div>

//       {/* 마이크 권한 상태 표시 (필요시 활성화)
//       <div className="mt-6 text-center">
//         {micPermissionGranted === null && (
//           <p className="text-sm text-gray-400 animate-pulse">마이크 권한을 확인 중입니다...</p>
//         )}
//         {micPermissionGranted === true && (
//           <p className="text-sm text-green-400">✅ 마이크가 준비되었습니다.</p>
//         )}
//         {micPermissionGranted === false && (
//           <p className="text-sm text-red-400">⚠️ 마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.</p>
//         )}
//       </div> */}

//       <div className="quick-actions" role="group" aria-label="AI 어시스턴트 모드 선택" aria-describedby="quick-actions-help">
//         <div id="quick-actions-help" className="sr-only">
//           다음 AI 어시스턴트 모드 중 하나를 선택하여 대화를 시작할 수 있습니다. 키보드의 Tab 키로 이동하고 Enter 키 또는 스페이스바로 선택하세요. 
//           {isAgentSelected && `현재 선택된 모드: ${agents[selectedAgentId]?.name} - ${agents[selectedAgentId]?.description}`}
//         </div>
        
//         {/* 일반 대화 모드 (0번) 제외하고 1, 2, 3번 Agent만 표시 */}
//         {Object.values(agents)
//           .filter(agent => agent.id !== 0)
//           .map((agent) => (
//             <button
//               key={agent.id}
//               className={`quick-action-btn ${
//                 isAgentSelected && selectedAgentId === agent.id
//                   ? 'selected'
//                   : ''
//               }`}
//               onClick={() => handleAgentClick(agent.id)}
//               onKeyDown={(e) => {
//                 // 스페이스바와 엔터키 모두 지원
//                 if (e.key === ' ' || e.key === 'Enter') {
//                   e.preventDefault();
//                   e.stopPropagation();
//                   handleAgentClick(agent.id);
//                 }
//                 // Escape 키로 선택 해제 (선택된 상태에서만)
//                 else if (e.key === 'Escape' && isAgentSelected && selectedAgentId === agent.id) {
//                   e.preventDefault();
//                   e.stopPropagation();
//                   handleAgentClick(agent.id); // 토글 방식이므로 같은 함수 호출
//                 }
//               }}
//               aria-label={`${agent.name} 모드 선택하기 - ${agent.description}. ${selectedAgentId === agent.id && isAgentSelected ? '현재 선택됨' : ''}`}
//               aria-pressed={selectedAgentId === agent.id && isAgentSelected}
//               aria-describedby={`agent-${agent.id}-desc`}
//               role="button"
//               tabIndex={0}
//             >
//               <span aria-hidden="true" role="img" aria-label={`${agent.name} 아이콘`}>{agent.symbol}</span> 
//               <span>{agent.name}</span>
//               <div id={`agent-${agent.id}-desc`} className="sr-only">
//                 {agent.description}
//                 {selectedAgentId === agent.id && isAgentSelected && ' (현재 선택된 모드)'}
//               </div>
//             </button>
//           ))}
//       </div>

//     </div>
//   );
// };  
import React from 'react';
import { AgentType } from '@/hooks/useAgentSelection';

interface WelcomeScreenProps {
  micPermissionGranted?: boolean | null;
  username?: string;
  selectedAgentId: number;
  isAgentSelected: boolean;
  onAgentSelect: (agentId: number) => void;
  agents: Record<number, AgentType>;
}

export const WelcomeScreen = ({ 
  micPermissionGranted, 
  username, 
  selectedAgentId, 
  isAgentSelected, 
  onAgentSelect, 
  agents 
}: WelcomeScreenProps) => {

  const handleAgentClick = (agentId: number) => {
    if (typeof agentId !== 'number' || agentId < 0) return;
    if (!(agentId in agents)) return;

    try {
      onAgentSelect(agentId);
    } catch (error) {
      console.error('Error selecting agent:', error);
    }
  };

  return (
    <div id="welcome-main" className="welcome-screen flex flex-col items-center justify-center min-h-[80vh] bg-[#F8F9FA]" role="main" aria-label="시각장애인을 위한 AI 어시스턴트 홈">
      
      <div className="text-center mb-12">
        <p className="welcome-title text-5xl font-bold mb-6 text-gray-800" role="heading" aria-level={1}>
          안녕하세요, {'Sapie'}
        </p>
        <p className="welcome-subtitle text-2xl text-gray-500" role="text">
          시각장애인을 위한 Sapie-Braille입니다. <br />음성으로 말씀하시거나 텍스트로 입력하세요.
        </p>
      </div>

      {/* --- [수정 1] 키보드 단축키 안내 (배경 제거, 글자: 볼드+주황색) --- */}
      <div className="mb-12" role="region" aria-labelledby="keyboard-shortcuts">
        <h2 id="keyboard-shortcuts" className="sr-only">키보드 단축키 안내</h2>
        
        <div className="flex gap-10 text-sm" role="list">
          <div className="flex items-center gap-3" role="listitem">
            <div className="flex gap-1">
              <kbd className="px-2.5 py-1.5 bg-gray-100 rounded-md text-xs font-mono border border-gray-300 text-gray-600">Space</kbd> 
              <span aria-hidden="true">+</span>
              <kbd className="px-2.5 py-1.5 bg-gray-100 rounded-md text-xs font-mono border border-gray-300 text-gray-600">Space</kbd>
            </div>
            {/* ▼ 변경: 볼드체 + 주황색 */}
            <span className="font-bold text-orange-500 text-base">녹음 시작/종료</span>
          </div>

          <div className="flex items-center gap-3" role="listitem">
            <div className="flex gap-1">
              <kbd className="px-2.5 py-1.5 bg-gray-100 rounded-md text-xs font-mono border border-gray-300 text-gray-600">Ctrl</kbd> 
              <span aria-hidden="true">+</span>
              <kbd className="px-2.5 py-1.5 bg-gray-100 rounded-md text-xs font-mono border border-gray-300 text-gray-600">O</kbd>
            </div>
            {/* ▼ 변경: 볼드체 + 주황색 */}
            <span className="font-bold text-orange-500 text-base">파일 탐색기</span>
          </div>

          <div className="flex items-center gap-3" role="listitem">
            <div className="flex gap-1">
              <kbd className="px-2.5 py-1.5 bg-gray-100 rounded-md text-xs font-mono border border-gray-300 text-gray-600">Ctrl</kbd> 
              <span aria-hidden="true">+</span>
              <kbd className="px-2.5 py-1.5 bg-gray-100 rounded-md text-xs font-mono border border-gray-300 text-gray-600">R</kbd>
            </div>
            {/* ▼ 변경: 볼드체 + 주황색 */}
            <span className="font-bold text-orange-500 text-base">음성 재생</span>
          </div>
        </div>
      </div>
      {/* ----------------------------------------------------- */}

      {/* --- [수정 2] 에이전트 카드 (크기 확대, 흰색 배경 디자인) --- */}
      <div 
        className="grid grid-cols-3 gap-8 w-full max-w-6xl px-4" 
        role="group" 
        aria-label="AI 어시스턴트 모드 선택" 
      >
        {Object.values(agents)
          .filter(agent => agent.id !== 0)
          .map((agent) => (
            <button
              key={agent.id}
              className={`
                flex flex-col items-center justify-center
                /* ▼ 변경: aspect-square를 넣어 정사각형으로 만듦 */
                aspect-square w-full p-8 rounded-3xl border-2 transition-all duration-200
                hover:shadow-xl hover:-translate-y-1
                ${isAgentSelected && selectedAgentId === agent.id
                  ? 'bg-orange-50 border-orange-500 ring-4 ring-orange-200 text-orange-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
              onClick={() => handleAgentClick(agent.id)}
              // ... (접근성 및 키보드 이벤트 핸들러는 기존 유지)
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault(); e.stopPropagation(); handleAgentClick(agent.id);
                } else if (e.key === 'Escape' && isAgentSelected && selectedAgentId === agent.id) {
                  e.preventDefault(); e.stopPropagation(); handleAgentClick(agent.id);
                }
              }}
              aria-label={`${agent.name} 모드 선택 - ${agent.description}`}
              aria-pressed={selectedAgentId === agent.id && isAgentSelected}
              tabIndex={0}
            >
              {/* ▼ 변경: 아이콘과 제목을 감싸는 가로(row) 컨테이너 추가 */}
              <div className="flex items-center gap-4 mb-4">
                {/* 아이콘 */}
                <span className="text-1xl filter drop-shadow-sm leading-none" aria-hidden="true" role="img">
                  {agent.symbol}
                </span>
                {/* 제목 */}
                <span className="text-3xl font-bold tracking-tight leading-none">
                  {agent.name}
                </span>
              </div>
              
              {/* 설명 (아래쪽에 배치) */}
              <span className={`text-lg text-center line-clamp-2 font-medium ${
                isAgentSelected && selectedAgentId === agent.id ? 'text-orange-600' : 'text-gray-500'
              }`}>
                {agent.description}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
};
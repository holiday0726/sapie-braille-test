import React, { useEffect } from 'react';
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
    // 입력 검증
    if (typeof agentId !== 'number' || agentId < 0) {
      console.error('Invalid agentId in handleAgentClick:', agentId);
      return;
    }

    // 에이전트 존재 여부 확인
    if (!(agentId in agents)) {
      console.error('Agent not found:', agentId);
      return;
    }

    try {
      onAgentSelect(agentId);
    } catch (error) {
      console.error('Error selecting agent:', error);
    }
  };
  return (
    <div id="welcome-main" className="welcome-screen" role="main" aria-label="시각장애인을 위한 AI 어시스턴트 홈">
      <p className="welcome-title text-5xl font-bold mb-10" role="heading" aria-level={1}>
        {/* 안녕하세요, {username || 'Hyeonchan'} */}
        안녕하세요, {'sapie'}
      </p>
      <p className="welcome-subtitle text-2xl" role="text">
        시각장애인을 위한 Sapie-Braille입니다. <br />음성으로 말씀하시거나 텍스트로 입력하세요.
      </p>
      <div className="mt-1 mb-20" role="region" aria-labelledby="keyboard-shortcuts">
        <h2 id="keyboard-shortcuts" className="sr-only">키보드 단축키 안내</h2>
        <div className="space-y-3" role="list" aria-label="사용 가능한 키보드 단축키 목록">
          <div className="text-primary-400 text-lg font-semibold" role="listitem">
            <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mr-2" aria-label="스페이스 키">space</kbd>
            <span aria-hidden="true">+</span>
            <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mx-2" aria-label="스페이스 키">space</kbd>
            <span className="ml-2">음성 녹음 시작/종료</span>
          </div>
          <div className="text-primary-400 text-lg font-semibold" role="listitem">
            <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mr-2" aria-label="컨트롤 키">Ctrl</kbd>
            <span aria-hidden="true">+</span>
            <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mx-2" aria-label="O 키">O</kbd>
            <span className="ml-2">파일 탐색기 실행</span>
          </div>
          <div className="text-primary-400 text-lg font-semibold" role="listitem">
            <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mr-2" aria-label="컨트롤 키">Ctrl</kbd>
            <span aria-hidden="true">+</span>
            <kbd className="px-2 py-1 bg-dark-800 rounded text-sm mx-2" aria-label="R 키">R</kbd>
            <span className="ml-2">텍스트 음성 재생</span>
          </div>
        </div>
      </div>

      {/* 마이크 권한 상태 표시 (필요시 활성화)
      <div className="mt-6 text-center">
        {micPermissionGranted === null && (
          <p className="text-sm text-gray-400 animate-pulse">마이크 권한을 확인 중입니다...</p>
        )}
        {micPermissionGranted === true && (
          <p className="text-sm text-green-400">✅ 마이크가 준비되었습니다.</p>
        )}
        {micPermissionGranted === false && (
          <p className="text-sm text-red-400">⚠️ 마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.</p>
        )}
      </div> */}

      <div className="quick-actions" role="group" aria-label="AI 어시스턴트 모드 선택" aria-describedby="quick-actions-help">
        <div id="quick-actions-help" className="sr-only">
          다음 AI 어시스턴트 모드 중 하나를 선택하여 대화를 시작할 수 있습니다. 키보드의 Tab 키로 이동하고 Enter 키 또는 스페이스바로 선택하세요. 
          {isAgentSelected && `현재 선택된 모드: ${agents[selectedAgentId]?.name} - ${agents[selectedAgentId]?.description}`}
        </div>
        
        {/* 일반 대화 모드 (0번) 제외하고 1, 2, 3번 Agent만 표시 */}
        {Object.values(agents)
          .filter(agent => agent.id !== 0)
          .map((agent) => (
            <button
              key={agent.id}
              className={`quick-action-btn ${
                isAgentSelected && selectedAgentId === agent.id
                  ? 'selected'
                  : ''
              }`}
              onClick={() => handleAgentClick(agent.id)}
              onKeyDown={(e) => {
                // 스페이스바와 엔터키 모두 지원
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAgentClick(agent.id);
                }
                // Escape 키로 선택 해제 (선택된 상태에서만)
                else if (e.key === 'Escape' && isAgentSelected && selectedAgentId === agent.id) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAgentClick(agent.id); // 토글 방식이므로 같은 함수 호출
                }
              }}
              aria-label={`${agent.name} 모드 선택하기 - ${agent.description}. ${selectedAgentId === agent.id && isAgentSelected ? '현재 선택됨' : ''}`}
              aria-pressed={selectedAgentId === agent.id && isAgentSelected}
              aria-describedby={`agent-${agent.id}-desc`}
              role="button"
              tabIndex={0}
            >
              <span aria-hidden="true" role="img" aria-label={`${agent.name} 아이콘`}>{agent.symbol}</span> 
              <span>{agent.name}</span>
              <div id={`agent-${agent.id}-desc`} className="sr-only">
                {agent.description}
                {selectedAgentId === agent.id && isAgentSelected && ' (현재 선택된 모드)'}
              </div>
            </button>
          ))}
      </div>

    </div>
  );
};  
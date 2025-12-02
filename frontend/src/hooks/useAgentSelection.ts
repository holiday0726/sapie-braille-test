import { useState, useCallback } from 'react';

export type AgentType = {
  id: number;
  name: string;
  symbol: string;
  description: string;
};

export const AGENTS: Record<number, AgentType> = {
  0: {
    id: 0,
    name: '일반 대화',
    symbol: '◯',
    description: '일반적인 질문과 대화'
  },
  // 1: {
  //   id: 1,
  //   name: '점역 변환',
  //   symbol: '○',
  //   description: '한글 텍스트를 점자로 변환'
  // },
  2: {
    id: 2,
    name: '뉴스 읽기',
    symbol: '◇',
    description: '오늘의 이슈는 뭐가 있어?'
  },
  3: {
    id: 3,
    name: '복지 정보',
    symbol: '□',
    description: '최근 복지가 뭐 있어?'
  },
  4: {
    id: 4,
    name: '날씨 정보',
    symbol: '◎',
    description: '현재 날씨 및 날씨 예보 정보 알려줘'
  },
  // 5: {
  //   id: 5,
  //   name: '문서 변환',
  //   symbol: '◈',
  //   description: '문서 파일을 분석하고 변환'
  // },
  6: {
    id: 6,
    name: '충북 장애인 단체',
    symbol: '◎',
    description: '장애인 단체 현황에 대해 알려줘'
  },
  7: {
    id: 7,
    name: '전국 장애인 공공시설',
    symbol: '◎',
    description: '과천 근처에 승강기 있는 시설 있어? '
  },
  8: {
    id: 8,
    name: '장애인 취업 도우미',
    symbol: '◎',
    description: '장애인 취업 정보 알려줄래?'
  },
};

export const useAgentSelection = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
  const [isAgentSelected, setIsAgentSelected] = useState<boolean>(false);

  // 상태 일관성 검증 함수
  const validateState = useCallback((agentId: number, selected: boolean) => {
    // 상태 동기화 검증: agentId가 0이면 selected는 false여야 함
    if (agentId === 0 && selected) {
      console.warn('Invalid state: agentId is 0 but isAgentSelected is true');
      return false;
    }
    // agentId가 0이 아니면 selected는 true여야 함
    if (agentId !== 0 && !selected) {
      console.warn('Invalid state: agentId is not 0 but isAgentSelected is false');
      return false;
    }
    return true;
  }, []);

  const selectAgent = useCallback((agentId: number) => {
    // 강화된 상태 검증
    if (!(agentId in AGENTS) || typeof agentId !== 'number' || agentId < 0) {
      console.error('Invalid agentId:', agentId);
      return;
    }

    // 이미 선택된 에이전트를 다시 클릭하면 해제 (토글 동작)
    if (isAgentSelected && selectedAgentId === agentId) {
      const newState = { agentId: 0, selected: false };
      if (validateState(newState.agentId, newState.selected)) {
        setSelectedAgentId(newState.agentId);
        setIsAgentSelected(newState.selected);
      }
    } else {
      // 일반 대화 모드(0번)는 선택할 수 없음
      if (agentId === 0) {
        console.warn('Cannot select general conversation mode (id: 0)');
        return;
      }

      const newState = { agentId, selected: true };
      if (validateState(newState.agentId, newState.selected)) {
        setSelectedAgentId(newState.agentId);
        setIsAgentSelected(newState.selected);
      }
    }
  }, [isAgentSelected, selectedAgentId, validateState]);

  const clearSelection = useCallback(() => {
    const newState = { agentId: 0, selected: false };
    if (validateState(newState.agentId, newState.selected)) {
      setSelectedAgentId(newState.agentId);
      setIsAgentSelected(newState.selected);
    }
  }, [validateState]);

  const getSelectedAgent = useCallback(() => {
    // 상태 일관성 검증 후 반환
    if (!validateState(selectedAgentId, isAgentSelected)) {
      console.error('State inconsistency detected in getSelectedAgent');
      return AGENTS[0]; // 기본값 반환
    }
    return AGENTS[selectedAgentId];
  }, [selectedAgentId, isAgentSelected, validateState]);

  const isAgentSelectedById = useCallback((agentId: number) => {
    // 입력 값 검증
    if (typeof agentId !== 'number' || !(agentId in AGENTS)) {
      return false;
    }
    return isAgentSelected && selectedAgentId === agentId;
  }, [isAgentSelected, selectedAgentId]);

  return {
    selectedAgentId,
    isAgentSelected,
    selectedAgent: getSelectedAgent(),
    selectAgent,
    clearSelection,
    isAgentSelectedById,
    agents: AGENTS
  };
};
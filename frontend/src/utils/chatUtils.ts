export const generateChatTitle = (firstMessage: string): string => {
  if (firstMessage.length <= 30) {
    return firstMessage;
  }
  return firstMessage.substring(0, 30) + '...';
};

export const hallucinationFilter = [
  "MBC 뉴스 이덕영입니다",
  "시청해주셔서 감사합니다",
  "Thanks for watching",
  "자막",
];

export const isHallucination = (text: string): boolean => {
  return hallucinationFilter.some(filterText => text.includes(filterText));
};
import React from 'react';

interface MarkdownTextProps {
  text: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Regex para capturar texto entre ** ou *
  const boldRegex = /(\*\*)(.*?)\1|\*([^*]+)\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Adicionar texto antes do match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    
    // Adicionar texto em negrito
    const boldText = match[2] || match[3];
    parts.push(<strong key={match.index}>{boldText}</strong>);
    
    currentIndex = match.index + match[0].length;
  }
  
  // Adicionar texto restante
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  return <>{parts.length > 0 ? parts : text}</>;
};

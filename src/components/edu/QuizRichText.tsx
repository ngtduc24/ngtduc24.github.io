import React from 'react';
import RichTextEditor from '../cms/RichTextEditor';

interface QuizRichTextProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  allowVideo?: boolean; // nội dung bài giảng E-Learning: khung soạn cao hơn, lưu video vào thư mục bài giảng
}

/**
 * Nội dung câu hỏi trắc nghiệm và bài giảng E-Learning dùng chung trình soạn thảo chuẩn của EduGo
 * (cùng thanh công cụ, cùng cách chèn ảnh, video từ Kho lưu trữ như trang soạn bài Website).
 */
export default function QuizRichText({ value, onChange, placeholder, allowVideo }: QuizRichTextProps) {
  return (
    <RichTextEditor
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder || 'Nhập nội dung câu hỏi...'}
      minHeight={allowVideo ? '360px' : '160px'}
      maxHeight={allowVideo ? '70vh' : '420px'}
      folder={allowVideo ? 'elearning-videos' : 'quiz-questions'}
    />
  );
}

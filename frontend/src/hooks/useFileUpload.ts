import { useState, useRef, useEffect } from 'react';
import { getDifyFileType } from '@/utils/fileUtils';
import { getApiUrl } from '@/utils/env';

export const useFileUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+O 파일 열기 단축키
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'o') {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadToDify = async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', 'default-user');

      console.log('Uploading file to Dify proxy...');
      const apiUrl = getApiUrl();
      const uploadResponse = await fetch(`${apiUrl}/dify-files-upload`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        console.log('Dify file upload successful:', uploadResult);

        return {
          type: getDifyFileType(file.type),
          transfer_method: 'local_file',
          upload_file_id: uploadResult.id,
          name: file.name,
          mime_type: file.type
        };
      } else {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || 'Dify 파일 업로드 실패');
      }
    } catch (error) {
      console.error("Dify 파일 업로드 오류:", error);
      throw error;
    }
  };

  const processSelectedFile = async (): Promise<any[] | null> => {
    if (!selectedFile) return null;

    try {
      const difyFile = await uploadToDify(selectedFile);
      return [difyFile];
    } catch (error) {
      alert(`파일 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      return null;
    }
  };

  return {
    selectedFile,
    fileInputRef,
    handleFileChange,
    handleRemoveFile,
    processSelectedFile
  };
};
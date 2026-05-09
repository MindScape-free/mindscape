import mammoth from 'mammoth';

/**
 * Extracts plain text from a Word document (.docx) using mammoth.
 * @param arrayBuffer The Word document as an ArrayBuffer.
 * @returns An object containing the extracted text.
 */
export async function parseDocxContent(arrayBuffer: ArrayBuffer): Promise<{ content: string }> {
  try {
    // Mammoth extractRawText returns a promise that resolves with the result
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('[DocProcessor] Messages during extraction:', result.messages);
    }

    return {
      content: result.value
    };
  } catch (error) {
    console.error('[DocProcessor] Failed to extract text from Word document:', error);
    throw new Error('Failed to parse Word document. Ensure it is a valid .docx file.');
  }
}

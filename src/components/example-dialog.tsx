
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, ChevronDown, Copy, Wand2, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ExplanationMode } from '@/types/mind-map';
import { useToast } from '@/hooks/use-toast';

/**
 * Props for the ExampleDialog component.
 * @interface ExampleDialogProps
 * @property {boolean} isOpen - Whether the dialog is open.
 * @property {() => void} onClose - Function to close the dialog.
 * @property {string} title - The title of the concept being explained.
 * @property {string} example - The real-life example text.
 * @property {boolean} isLoading - Whether the example is currently loading.
 * @property {ExplanationMode} explanationMode - The current explanation detail level.
 * @property {(mode: ExplanationMode) => void} onExplanationModeChange - Callback to change the detail level.
 * @property {() => void} onRegenerate - Callback to regenerate the example.
 */
interface ExampleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  example: string;
  isLoading: boolean;
  explanationMode: ExplanationMode;
  onExplanationModeChange: (mode: ExplanationMode) => void;
  onRegenerate: () => void;
  isGlobalBusy?: boolean;
}

/**
 * A dialog component to display a real-life example for a mind map node.
 * @param {ExampleDialogProps} props - The props for the component.
 * @returns {JSX.Element} The example dialog.
 */
export function ExampleDialog({
  isOpen,
  onClose,
  title,
  example,
  isLoading,
  explanationMode,
  onExplanationModeChange,
  onRegenerate,
  isGlobalBusy = false,
}: ExampleDialogProps) {
  const isBusy = isLoading || isGlobalBusy;
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(example);
    setIsCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRegenerate = () => {
    onRegenerate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl rounded-2xl glassmorphism p-8 shadow-2xl shadow-purple-900/20" showCloseButton={false}>
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="rounded-full absolute top-4 right-4">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>

        <DialogHeader className="text-center items-center">
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Example For: {title}
          </DialogTitle>
          <DialogDescription className="mt-2 text-base">
            A real-life analogy to help you understand this concept.
          </DialogDescription>
          <div className="flex justify-center pt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full" disabled={isBusy}>
                  {explanationMode}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="glassmorphism">
                <DropdownMenuItem onSelect={() => onExplanationModeChange('Beginner')}>
                  Beginner
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onExplanationModeChange('Intermediate')}>
                  Intermediate
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onExplanationModeChange('Expert')}>
                  Expert
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="py-6 min-h-[120px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : (
            <p className="text-lg text-center leading-relaxed text-zinc-300">{example}</p>
          )}
        </div>

        <div className="flex justify-center gap-3 pt-4">
          <Button variant="outline" onClick={handleCopy} disabled={isBusy || isCopied}>
            <Copy className="h-4 w-4 mr-2" />
            {isCopied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="default" onClick={handleRegenerate} disabled={isBusy}>
            <Wand2 className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

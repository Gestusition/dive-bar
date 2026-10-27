import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  art,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  art?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="dialog-overlay" />
        <Primitive.Content className="dialog-content">
          <header>
            {art && <span className="dialog-art">{art}</span>}
            <Primitive.Title>{title}</Primitive.Title>
            <Primitive.Description className="sr-only">
              {description ?? 'The game is paused while this window is open.'}
            </Primitive.Description>
            <Primitive.Close className="close-button" aria-label="Close dialog">
              <X size={20} strokeWidth={3} />
            </Primitive.Close>
          </header>
          <div className="dialog-scroll">{children}</div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

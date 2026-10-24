import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="dialog-overlay" />
        <Primitive.Content className="dialog-content">
          <header>
            <div>
              <Primitive.Title>{title}</Primitive.Title>
              <Primitive.Description className="muted">
                {description ?? 'Take your time. The bar is paused.'}
              </Primitive.Description>
            </div>
            <Primitive.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Primitive.Close>
          </header>
          <div className="dialog-scroll">{children}</div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

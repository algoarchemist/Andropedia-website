// LND-07: the Error 404 modal every Apply now opens.
import { copy } from '@andropedia/shared';
import { Dialog } from './Dialog';

type ErrorModalProps = {
  onClose: () => void;
  onContinue: () => void;
};

export function ErrorModal({ onClose, onContinue }: ErrorModalProps) {
  return (
    <Dialog
      title={copy.modal.title}
      body={copy.modal.body}
      primary={{ label: copy.modal.continue, onClick: onContinue }}
      onClose={onClose}
    />
  );
}

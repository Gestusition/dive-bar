import { ArrowRight, MessageCircle, Receipt, UtensilsCrossed } from 'lucide-react';
import { Button } from '../components/ui/button';
import { money, recipeById } from '../game/content';
import { conversationFor, type Guest } from '../game/engine';
import { useGame } from '../game/store';

export const statusLabels: Record<Guest['status'], string> = {
  waiting: 'At the door',
  reading: 'Reading the menu',
  ready: 'Ready to order',
  ordered: 'Waiting for a drink',
  drinking: 'Enjoying the drink',
  pay: 'Ready to pay',
  leaving: 'Heading home',
};

export function patience(guest: Guest) {
  if (guest.status !== 'ready' && guest.status !== 'ordered') return null;
  return Math.max(0, Math.min(1, guest.remaining / (guest.status === 'ready' ? 75 : 160)));
}

/** The little speech-card that opens above a guest when you tap them. */
export function GuestActions({ guest }: { guest: Guest }) {
  const { enqueue, game, select, setPanel, talk } = useGame();
  const canTalk = !!conversationFor(game, guest);
  const tabOpen = ['ordered', 'drinking', 'pay'].includes(guest.status);
  const regular = game.visitCount[guest.customerId] > 0;
  return (
    <div className="guest-card" onClick={(e) => e.stopPropagation()}>
      <div className="guest-card-head">
        <span className={'portrait ' + guest.customerId}>{guest.name[0]}</span>
        <span>
          <strong>{guest.name}</strong>
          <small>
            {statusLabels[guest.status]}
            {regular && ' · regular'}
          </small>
        </span>
      </div>
      {tabOpen && (
        <div className="guest-order">
          {recipeById(guest.recipeId).name}
          {guest.extraCherry && <span>+ extra cherry</span>}
        </div>
      )}
      <div className="guest-card-actions">
        {guest.status === 'waiting' && (
          <Button size="sm" onClick={() => enqueue(guest.id, 'seat')}>
            Seat guest <ArrowRight size={15} />
          </Button>
        )}
        {guest.status === 'reading' && <p className="hint">Give them a moment to choose.</p>}
        {guest.status === 'ready' && (
          <Button size="sm" onClick={() => enqueue(guest.id, 'order')}>
            Take order
          </Button>
        )}
        {guest.status === 'ordered' && (
          <>
            <Button
              size="sm"
              onClick={() => {
                select(guest.id);
                setPanel('station');
              }}
            >
              Make drink <ArrowRight size={15} />
            </Button>
            {canTalk && (
              <Button size="sm" variant="secondary" onClick={() => talk(guest.id)}>
                <MessageCircle size={15} /> Chat
              </Button>
            )}
          </>
        )}
        {guest.status === 'drinking' && (
          <p className="hint">Let them enjoy it. The tab stays open.</p>
        )}
        {guest.status === 'pay' && (
          <Button size="sm" onClick={() => enqueue(guest.id, 'pay')}>
            <Receipt size={15} /> Settle {money(guest.charge - guest.paidAmount)}
          </Button>
        )}
      </div>
      {tabOpen && guest.food !== 'served' && (
        <div className="guest-card-snacks">
          {guest.food === 'none' ? (
            <>
              <button onClick={() => enqueue(guest.id, 'food')}>
                <UtensilsCrossed size={13} /> Pretzel · $5
              </button>
              <button onClick={() => enqueue(guest.id, 'food', 'toastie')}>
                <UtensilsCrossed size={13} /> Toastie · $7
              </button>
            </>
          ) : (
            <button disabled={guest.food === 'warming'} onClick={() => enqueue(guest.id, 'food')}>
              <UtensilsCrossed size={13} />
              {guest.food === 'ready' ? 'Serve ' + guest.foodType : 'Warming up…'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

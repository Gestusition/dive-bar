import { ArrowRight, MessageCircle, Receipt, UtensilsCrossed, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { money, recipeById } from '../game/content';
import { conversationFor, mood, party, seatProblem, type Guest } from '../game/engine';
import { useGame } from '../game/store';
import { Portrait } from './Portrait';

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

/** How the group asks to pay, in the lead guest's words. */
const askLine = (split: Guest['splitAsk'], count: number) =>
  split === 'split'
    ? count > 2
      ? 'Separate bills for us, please.'
      : 'Can we split it? Half each.'
    : 'One bill. This round’s on me.';

/** The little speech-card that opens above a guest when you tap them. */
export function GuestActions({ guest }: { guest: Guest }) {
  const { enqueue, game, select, setPanel, talk } = useGame();
  const canTalk = !!conversationFor(game, guest);
  const tabOpen = ['ordered', 'drinking', 'pay'].includes(guest.status);
  const regular = game.visitCount[guest.customerId] > 0;
  const group = party(game, guest);
  const friends = group.filter((g) => g.id !== guest.id);
  const together = group.length > 1;
  const seatIssue = guest.status === 'waiting' ? seatProblem(game, guest) : null;
  const unpaid = group.filter((g) => !g.paid);
  const total = unpaid.reduce((n, g) => n + g.charge - g.paidAmount, 0);
  const stillDrinking = unpaid.find((g) => g.status !== 'pay');
  const lead = group.find((g) => g.lead) ?? guest;
  return (
    <div className="guest-card" onClick={(e) => e.stopPropagation()}>
      <div className="guest-card-head">
        <Portrait id={guest.customerId} />
        <span>
          <strong>{guest.name}</strong>
          <small>
            {guest.status !== 'drinking'
              ? statusLabels[guest.status]
              : {
                  happy: statusLabels.drinking,
                  neutral: 'The drink is all right',
                  unhappy: 'Not enjoying the drink',
                }[mood(guest)]}
            {regular && ' · regular'}
          </small>
        </span>
      </div>
      {friends.length > 0 && (
        <p className="guest-with">
          <Users size={13} /> With {friends.map((g) => g.name).join(' and ')}
        </p>
      )}
      {tabOpen && (
        <div className="guest-order">
          {recipeById(guest.recipeId).name}
          {guest.extraCherry && <span>+ extra cherry</span>}
        </div>
      )}
      <div className="guest-card-actions">
        {guest.status === 'waiting' &&
          (seatIssue ? (
            <p className="hint">{seatIssue}</p>
          ) : (
            <Button size="sm" onClick={() => enqueue(guest.id, 'seat')}>
              {together ? 'Seat them' : 'Seat guest'} <ArrowRight size={15} />
            </Button>
          ))}
        {guest.status === 'reading' && <p className="hint">Give them a moment to choose.</p>}
        {guest.status === 'ready' && (
          <Button size="sm" onClick={() => enqueue(guest.id, 'order')}>
            {group.filter((g) => g.status === 'ready').length > 1
              ? 'Take their orders'
              : 'Take order'}
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
        {guest.status === 'pay' &&
          (stillDrinking ? (
            <p className="hint">
              Waiting for {stillDrinking.name} to finish. They’ll pay together.
            </p>
          ) : together ? (
            <>
              <p className="guest-ask">
                <b>{lead.name}:</b> “{askLine(lead.splitAsk, unpaid.length)}”
              </p>
              <Button size="sm" onClick={() => enqueue(guest.id, 'pay', { split: 'one' })}>
                <Receipt size={15} /> One bill · {money(total)}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => enqueue(guest.id, 'pay', { split: 'split' })}
              >
                <Receipt size={15} /> Split ·{' '}
                {unpaid.map((g) => money(g.charge - g.paidAmount)).join(' + ')}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => enqueue(guest.id, 'pay')}>
              <Receipt size={15} /> Settle {money(total)}
            </Button>
          ))}
      </div>
      {/* Snacks are offered while they drink; once paying, only one already on its way. */}
      {tabOpen &&
        guest.food !== 'served' &&
        guest.food !== 'declined' &&
        (guest.status !== 'pay' || guest.food !== 'none') && (
          <div className="guest-card-snacks">
            {guest.food === 'none' ? (
              <>
                <button aria-label="Offer pretzel, $5" onClick={() => enqueue(guest.id, 'food')}>
                  <UtensilsCrossed size={13} /> Pretzel · $5
                </button>
                <button
                  aria-label="Offer toastie, $7"
                  onClick={() => enqueue(guest.id, 'food', { foodType: 'toastie' })}
                >
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
      {tabOpen && guest.food === 'declined' && (
        <p className="hint" role="status">
          “No snack for me, thanks.”
        </p>
      )}
    </div>
  );
}

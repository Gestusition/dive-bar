import { useState } from 'react';
import { Check, Receipt, GlassWater } from 'lucide-react';
import { recipes, prices, recipeById, money, stockItems, names, snacks } from '../game/content';
import { useGame } from '../game/store';
import { Button } from '../components/ui/button';
import { DrinkArt } from './art';

export function MenuPanel() {
  const { game, act } = useGame();
  const editable = ['opening', 'recap'].includes(game.phase);
  return (
    <>
      <p className="hint">
        Pick 1 to 6 drinks. <b>{game.activeMenu.length}/6 selected</b>
      </p>
      <div className="menu-catalogue">
        {recipes.map((r) => (
          <button
            key={r.id}
            disabled={!editable}
            aria-pressed={game.activeMenu.includes(r.id)}
            onClick={() => act({ type: 'toggleMenu', id: r.id })}
          >
            <span className="menu-check">
              {game.activeMenu.includes(r.id) ? <Check size={14} strokeWidth={3} /> : null}
            </span>
            <DrinkArt size={36} id={r.id} />
            <strong>{r.name}</strong>
            <b>{money(prices[r.id])}</b>
          </button>
        ))}
      </div>
      {!editable && (
        <p className="hint">You can change the menu before opening or after closing.</p>
      )}
    </>
  );
}
export function StockPanel() {
  const { game, act, setPanel } = useGame();
  const rows = [
    ...stockItems.map((i) => ({
      id: i.id,
      name: names[i.id] ?? i.id.replaceAll('_', ' '),
      unit: i.unit,
      par: i.parQuantity,
      current: game.inventory[i.id] ?? 0,
      cost: i.costMinorPerUnit,
      step: i.unit === 'ml' ? 50 : 1,
    })),
    ...snacks.map((i) => ({
      id: 'snack_' + i.id,
      name: i.name,
      unit: 'piece',
      par: i.id === 'pretzel' ? 12 : 8,
      current: game.foodStock[i.id],
      cost: i.cost,
      step: 1,
    })),
  ];
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(rows.map((i) => [i.id, Math.ceil(Math.max(0, i.par - i.current))])),
  );
  const total = rows.reduce((sum, i) => sum + Math.ceil((quantities[i.id] ?? 0) * i.cost), 0);
  return (
    <>
      <p className="hint">
        Amounts are set to fill the shelves. Till: {money(game.cash)} in the till.
      </p>
      <div className="stock-list">
        {rows
          .filter((r) => r.current < r.par || quantities[r.id] > 0)
          .map((i) => (
            <div key={i.id}>
              <span>
                <strong>{i.name}</strong>
                <small>
                  {Math.floor(i.current)} / {i.par} {i.unit}
                </small>
              </span>
              <div className="stock-quantity">
                <button
                  aria-label={'Less ' + i.name}
                  onClick={() =>
                    setQuantities((q) => ({ ...q, [i.id]: Math.max(0, (q[i.id] ?? 0) - i.step) }))
                  }
                >
                  −
                </button>
                <output>{quantities[i.id] ?? 0}</output>
                <button
                  aria-label={'More ' + i.name}
                  onClick={() => setQuantities((q) => ({ ...q, [i.id]: (q[i.id] ?? 0) + i.step }))}
                >
                  +
                </button>
              </div>
              <b>{money((quantities[i.id] ?? 0) * i.cost)}</b>
            </div>
          ))}
      </div>
      {rows.every((r) => r.current >= r.par) && (
        <div className="quiet-state">
          <GlassWater />
          <h3>Shelves are full</h3>
          <p>Nothing to buy tonight.</p>
        </div>
      )}
      <div className="stock-total">
        <span>Restock total</span>
        <strong>{money(total)}</strong>
      </div>
      <Button
        className="wide"
        disabled={total > game.cash}
        onClick={() => {
          act({ type: 'purchase', items: quantities });
          setPanel('floor');
        }}
      >
        {total ? 'Buy for ' + money(total) : 'Done, nothing to buy'}
      </Button>
      {total > game.cash && (
        <p className="error-text">Adjust the quantities to stay within the till.</p>
      )}
    </>
  );
}
export function PosPanel() {
  const { game, act } = useGame();
  const [split, setSplit] = useState(1);
  const tabs = game.guests.filter((g) => g.charge > 0 && !g.paid);
  return (
    <>
      <p className="hint">
        Split a bill or settle it in one go. Tips are added when the tab closes.
      </p>
      {tabs.length ? (
        tabs.map((g) => (
          <div className="pos-tab" key={g.id}>
            <div>
              <strong>{g.name}</strong>
              <span>{money(g.charge)}</span>
            </div>
            <p>
              {recipeById(g.recipeId).name}
              {g.food === 'served' ? ' + ' + snacks.find((n) => n.id === g.foodType)!.name : ''}
            </p>
            <div className="segmented">
              {[1, 2, 3].map((n) => (
                <button
                  disabled={g.paidAmount > 0}
                  key={n}
                  aria-pressed={split === n}
                  onClick={() => setSplit(n)}
                >
                  {n === 1 ? 'One bill' : n + ' ways'}
                </button>
              ))}
            </div>
            <p className="hint">
              Paid {money(g.paidAmount)} · Remaining {money(g.charge - g.paidAmount)}
            </p>
            <div className="payment-shares">
              {Array.from({ length: split }, (_, index) => {
                const amount =
                  Math.floor(g.charge / split) + (index === split - 1 ? g.charge % split : 0);
                const paymentId = [game.day, g.id, split, index].join(':share:');
                const paid = game.committed.includes(paymentId);
                return (
                  <Button
                    key={index}
                    variant={paid ? 'ghost' : 'secondary'}
                    disabled={
                      paid || g.status !== 'pay' || g.food === 'warming' || g.food === 'ready'
                    }
                    onClick={() =>
                      act({
                        type: 'guest',
                        id: g.id,
                        operation: 'pay',
                        amountMinor: amount,
                        paymentId,
                      })
                    }
                  >
                    {paid ? <Check size={15} /> : <Receipt size={15} />}{' '}
                    {split === 1 ? 'Settle tab' : 'Share ' + (index + 1)} · {money(amount)}
                  </Button>
                );
              })}
            </div>
            {g.status !== 'pay' && (
              <small className="hint">Still drinking — they’ll be ready soon.</small>
            )}
          </div>
        ))
      ) : (
        <div className="quiet-state">
          <Receipt size={30} />
          <h3>No open tabs</h3>
          <p>Everyone has paid.</p>
        </div>
      )}
    </>
  );
}

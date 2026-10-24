import './management.css';
import { useState } from 'react';
import { Check, Receipt, GlassWater } from 'lucide-react';
import { recipes, prices, recipeById, money, stockItems, names, snacks } from '../game/content';
import { useGame } from '../game/store';
import { Button } from '../components/ui/button';

export function MenuPanel() {
  const { game, act } = useGame();
  const editable = ['opening', 'recap'].includes(game.phase);
  return (
    <>
      <p className="muted">
        Choose one to six drinks for tonight. Everything is available at the Practice Bench.{' '}
        {game.activeMenu.length}/6 selected.
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
              {game.activeMenu.includes(r.id) ? <Check size={15} /> : null}
            </span>
            <span>
              <strong>{r.name}</strong>
              <small>{r.source.publisher ?? 'International Bartenders Association'}</small>
            </span>
            <b>{money(prices[r.id])}</b>
          </button>
        ))}
      </div>
      {!editable && (
        <p className="muted">
          Change the menu between shifts. Current orders keep their original recipe and price.
        </p>
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
      <p className="muted">
        Suggested quantities bring the shelves back to par. Edit them before buying.{' '}
        {money(game.cash)} in the till.
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
          <h3>Shelves looking lovely.</h3>
          <p>Nothing to buy. Check stock and carry on.</p>
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
        {total ? 'Confirm restock' : 'Stock checked · no purchase'}
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
      <p className="muted">
        Split a bill, collect each share, and keep the rounding on the last one. Tips are counted
        once, when the tab closes.
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
            <p className="muted">
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
              <small className="muted">They’re still enjoying their drink.</small>
            )}
          </div>
        ))
      ) : (
        <div className="quiet-state">
          <Receipt size={30} />
          <h3>No open bills.</h3>
          <p>The till is happy.</p>
        </div>
      )}
    </>
  );
}

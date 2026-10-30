/**
 * Every character's colours, worked out from their id. The 3D body and the face on
 * their cards both use these, so a guest looks the same in the room and on a card.
 */
export const shirtColors = ['#669f8e', '#b97876', '#d2a054', '#8088a8', '#986d98', '#d6bd8b'];
export function personLook(id: string, bartender = false) {
  const index = [...id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return {
    skin: ['#e9b592', '#b97857', '#db9e78', '#f0c7a1'][index % 4],
    hair: ['#403029', '#a85e39', '#d2a265', '#674143'][index % 4],
    shirt: bartender ? '#ead7ac' : shirtColors[index % shirtColors.length],
  };
}

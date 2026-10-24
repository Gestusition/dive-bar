import { describe, expect, it } from 'vitest';
import { emptyPrep, newGame, quality, reduceGame, conversationFor, type Game, type Prep } from './engine';
import { recipeById } from './content';
import { validateSave } from './storage';
function ordered(): Game { let s=reduceGame(newGame(),{type:'open'});s=reduceGame(s,{type:'guest',id:1,operation:'seat'});for(let i=0;i<9;i++)s=reduceGame(s,{type:'tick',dt:1});return reduceGame(s,{type:'guest',id:1,operation:'order'}); }
const margarita=():Prep=>({...emptyPrep(),amounts:{tequila_100_agave:50,triple_sec:20,fresh_lime_juice:15},ice:true,chilled:true,technique:'shake' as const});
const oldFashioned=():Prep=>({...emptyPrep(),amounts:{bourbon:45,sugar_cube:1,angostura_bitters:2,plain_water:2},ice:true,dissolved:true,technique:'stir' as const,tool:'old_fashioned_glass' as const,glass:'old_fashioned_glass' as const,garnish:{orange_zest:1,cocktail_cherry:1}});
describe('real recipe rules',()=>{
 it('accepts the exact Margarita and omitted optional salt rim',()=>expect(quality(margarita(),recipeById('margarita'))).toMatchObject({score:100,invalid:false}));
 it('rejects doubled servings even when ratios match',()=>{const p=margarita();p.amounts={tequila_100_agave:100,triple_sec:40,fresh_lime_juice:30};expect(quality(p,recipeById('margarita')).invalid).toBe(true)});
 it('rejects the wrong base',()=>{const p=margarita();p.amounts={bourbon:50,triple_sec:20,fresh_lime_juice:15} as typeof p.amounts;expect(quality(p,recipeById('margarita')).score).toBeLessThan(50)});
 it('does not reward the wrong primary method as Good',()=>{const p=margarita();p.technique='stir' as 'shake';expect(quality(p,recipeById('margarita')).score).toBeLessThan(75)});
 it('accepts both whiskey alternatives and every accepted dash range',()=>{for(const whiskey of ['bourbon','rye_whiskey'])for(const dash of [2,3]){const p=oldFashioned();p.amounts={[whiskey]:45,sugar_cube:1,angostura_bitters:dash,plain_water:dash} as typeof p.amounts;expect(quality(p,recipeById('old_fashioned')).score).toBe(100)}});
 it('flags missing sugar dissolution',()=>{const p=oldFashioned();p.dissolved=false;expect(quality(p,recipeById('old_fashioned')).issues).toContain('Dissolve the sugar before adding whiskey')});
});
describe('inventory and transactions',()=>{
 it('does not mutate an input snapshot',()=>{const s=ordered();const before=structuredClone(s);reduceGame(s,{type:'prep',id:1,operation:'measure',ingredient:'rye_whiskey',amount:50});expect(s).toEqual(before)});
 it('deducts a measure once; transfer and discard cannot refund it',()=>{let s=ordered();const before=s.inventory.rye_whiskey;s=reduceGame(s,{type:'prep',id:1,operation:'measure',ingredient:'rye_whiskey',amount:50});expect(s.inventory.rye_whiskey).toBe(before-50);s=reduceGame(s,{type:'prep',id:1,operation:'transfer'});s=reduceGame(s,{type:'prep',id:1,operation:'transfer'});expect(s.guests[0].prep.amounts.rye_whiskey).toBe(50);s=reduceGame(s,{type:'prep',id:1,operation:'discard'});expect(s.inventory.rye_whiskey).toBe(before-50);expect(s.guests[0].prep.attempts).toBe(1)});
 it('keeps practice inventory separate',()=>{const s=newGame();expect(reduceGame(s,{type:'prep',id:-1,operation:'measure',ingredient:'tequila_100_agave',amount:50}).inventory).toEqual(s.inventory)});
 it('never pays a tab twice',()=>{let s=ordered();Object.assign(s.guests[0],{status:'pay',charge:1400,served:true});s=reduceGame(s,{type:'guest',id:1,operation:'pay'});const cash=s.cash;s=reduceGame(s,{type:'guest',id:1,operation:'pay'});expect(s.cash).toBe(cash);expect(s.stats.tips).toBe(140)});
 it('does not overdraw stock during a held pour',()=>{let s=ordered();s.inventory.rye_whiskey=3;for(let i=0;i<10;i++)s=reduceGame(s,{type:'prep',id:1,operation:'measure',ingredient:'rye_whiskey',amount:2});expect(s.inventory.rye_whiskey).toBe(1);expect(s.guests[0].prep.measure?.quantity).toBe(2)});
});
describe('sweet lies and stable memories',()=>{
 it('truthfully naming the supermarket cancels only that order',()=>{let s=ordered();s=reduceGame(s,{type:'choice',id:1,conversationId:'cherry_origin',nodeId:'start',choiceId:'start_1'});expect(s.guests[0].status).toBe('leaving');expect(s.cash).toBe(12000)});
 it('records the charming lie and ignores repeated choice activation',()=>{let s=ordered();const a={type:'choice' as const,id:1,conversationId:'cherry_origin',nodeId:'start',choiceId:'start_2'};s=reduceGame(s,a);const tip=s.guests[0].tipDelta;expect(s.history['mara|cherry_origin']).toBe('local_family_orchard');s=reduceGame(s,a);expect(s.guests[0].tipDelta).toBe(tip)});
 it('gates the returning callback on the current story',()=>{const s=ordered();s.history['mara|cherry_origin']='local_family_orchard';expect(conversationFor(s,s.guests[0])?.id).toBe('cherry_story_callback');s.history['mara|cherry_origin']='mountain_orchard';expect(conversationFor(s,s.guests[0])?.id).toBe('cherry_origin')});
});
describe('save recovery and last call',()=>{
 it('round trips a valid saved night',()=>{const s=ordered();expect(validateSave(JSON.parse(JSON.stringify(s)))).toEqual(s)});
 it('rejects unknown recipes and corrupt currency',()=>{const s=ordered();s.guests[0].recipeId='not_a_drink';expect(()=>validateSave(s)).toThrow();expect(()=>validateSave({...newGame(),cash:-1})).toThrow()});
 it('keeps last call serializable and preserves unpaid tabs',()=>{let s=ordered();Object.assign(s.guests[0],{status:'pay',charge:1400,served:true});s=reduceGame(s,{type:'finish'});s.seconds=509;for(let i=0;i<5;i++)s=reduceGame(s,{type:'tick',dt:1});expect(s.guests[0].status).toBe('pay');expect(()=>validateSave(JSON.parse(JSON.stringify(s)))).not.toThrow()});
});

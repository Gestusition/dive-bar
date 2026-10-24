import { Suspense, useMemo, useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGame } from '../game/store';
import { volume, type Guest } from '../game/engine';
type Part = [number, number, number, number, number, number, string];
const oak = '#805137', dark = '#50352e', brass = '#c9995d', cream = '#ead7ac', teal = '#478f83';
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .87 });
function geometry(parts: Part[]) {
 const geometries = parts.map(([x,y,z,w,h,d,color]) => { const g = new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); const c = new THREE.Color(color); const values = new Float32Array(g.attributes.position.count * 3); for (let i=0;i<values.length;i+=3) { values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b; } g.setAttribute('color',new THREE.BufferAttribute(values,3)); return g; });
 const merged = mergeGeometries(geometries)!; geometries.forEach(g => g.dispose()); return merged;
}
function roomParts() {
 const p: Part[] = []; const box = (x:number,y:number,z:number,w:number,h:number,d:number,c:string) => p.push([x,y,z,w,h,d,c]);
 box(0,-.22,.4,11.8,.35,10.4,dark);
 for(let x=0;x<12;x++)for(let z=0;z<10;z++)box(x-.5-5,.005,z-4,.96,.12,.96,['#ab7851','#b48359','#a16d49','#ba8b62'][(x*7+z*3)%4]);
 box(0,1.6,-4.55,11.8,3.4,.25,'#6b463b'); box(-5.8,1.55,.3,.25,3.3,9.7,'#744b3c');
 for(let i=0;i<12;i++)box(i-5.5,.7,-4.37,.05,1.55,.1,brass);
 box(0,.12,-4.32,11.5,.18,.18,dark);box(0,3.15,-4.3,11.5,.15,.2,dark);
 // Framed windows and their little glowing sill lamps.
 for(const x of [-3.9,3.9]) {box(x,2,-4.33,1.65,1.65,.16,dark);box(x,2,-4.2,1.4,1.4,.1,'#294c59');box(x,2,-4.1,.06,1.4,.05,cream);box(x,2,-4.1,1.4,.06,.05,cream);box(x,1.15,-4.1,1.9,.12,.5,brass);}
 // Bottle shelves: one merged mesh rather than a mesh for every voxel.
 for(const y of [1.5,2.25]) {box(0,y,-4.05,5.1,.13,.66,dark);for(let i=0;i<13;i++){const x=-2.3+i*.38;const c=['#497c69','#7b4437','#c9944a','#466a62','#9c594c'][i%5];box(x,y+.23,-4.01,.18,.34,.2,c);box(x,y+.44,-4.01,.085,.12,.09,c);box(x,y+.26,-3.9,.18,.13,.025,cream);box(x,y+.52,-4.01,.09,.05,.1,brass);}}
 // Counter: panelling, brass foot rail, drawers, POS and working mat.
 box(0,.56,-1.8,7.6,1.1,1.05,oak);box(0,1.15,-1.8,8,.2,1.35,'#ddaf77');box(0,1.05,-1.11,7.8,.12,.08,brass);box(0,.35,-1.08,7.3,.06,.07,brass);
 for(let x=-3;x<=3;x++) {box(x,.66,-1.24,.82,.74,.08,'#714832');box(x,.66,-1.18,.64,.56,.03,'#86573a');}
 box(-.1,1.26,-1.7,2,.025,.9,'#28473f');box(3,1.38,-1.7,.55,.3,.45,'#3c4547');box(3,1.58,-1.8,.55,.14,.28,'#98c8ac');
 box(-2.4,1.32,-1.7,.58,.12,.6,'#617d7a');box(-2.4,1.38,-1.7,.4,.05,.4,'#bdc9bc');
 // Two tables and low cushioned chairs.
 for(const [x,z] of [[-2.7,2],[2.25,2.25]]) {box(x,.78,z,1.75,.15,1.45,'#d3a36c');box(x,.36,z,.23,.75,.23,dark);box(x,.08,z,1,.12,.8,dark);box(x,1,z,.12,.3,.12,teal);box(x,1.17,z,.22,.12,.22,'#7da071');box(x,1.25,z,.12,.14,.12,'#668f60');box(x+.4,.89,z-.3,.32,.03,.25,cream);
  for(const offset of [-.98,.98]) {box(x,.45,z+offset,.8,.16,.7,dark);box(x,.56,z+offset,.7,.13,.61,'#a9555b');for(const dx of [-.27,.27])box(x+dx,.2,z+offset,.09,.42,.5,dark);if(offset>0)box(x,.88,z+offset+.26,.8,.7,.1,dark);}}
 for(const x of [-1.2,1.2]) {box(x,.7,-.25,.7,.18,.7,'#b26061');box(x,.35,-.25,.16,.7,.16,dark);box(x,.08,-.25,.62,.08,.62,brass);}
 // Jukebox, rug and a leafy plant.
 box(-4.8,.65,-1.3,.8,1.3,.75,'#883f4b');box(-4.8,.89,-.9,.58,.64,.05,cream);box(-4.8,.91,-.86,.42,.4,.05,'#5f9b92');for(let i=0;i<5;i++)box(-4.8,.2+i*.07,-.9,.55,.03,.04,brass);
 box(0,.09,2.3,1.9,.018,3.3,'#9b5650');for(let x=-.8;x<1;x+=.4)box(x,.11,2.3,.06,.01,3,'#d5a169');
 box(4.65,.3,-3.3,.7,.6,.7,'#bb7658');box(4.65,.8,-3.3,.1,.6,.1,'#627650');for(let i=0;i<7;i++)box(4.65+Math.sin(i*2)*.28,1+i*.1,-3.3+Math.cos(i*2)*.25,.45,.16,.38,['#63835c','#8da16a','#506e52'][i%3]);
 // Amber lights, framed menu and coat hooks.
 for(const x of [-4.8,-2.4,0,2.4,4.8]) {box(x,2.85,-4.08,.2,.32,.18,brass);box(x,2.85,-3.96,.12,.2,.1,'#ffe2a3');}
 box(-5.58,1.7,1.4,.15,1.3,1,dark);box(-5.47,1.7,1.4,.04,1.1,.8,'#ddc594');
 return p;
}
const positions: [number,number,number][] = [[-2.7,.18,2.95],[2.25,.18,3.2],[-1.2,.35,-.25],[1.2,.35,-.25]];
export const guestPosition = (g: Guest): [number,number,number] => g.status === 'waiting' ? [-4.6,0,4.1] : positions[g.seat] ?? [-4.6,0,4.1];
const shirts=['#669f8e','#b97876','#d2a054','#8088a8','#986d98','#d6bd8b'];
function personParts(id:string, bartender=false): Part[] {
 const index=[...id].reduce((n,c)=>n+c.charCodeAt(0),0);const skin=['#e9b592','#b97857','#db9e78','#f0c7a1'][index%4],hair=['#403029','#a85e39','#d2a265','#674143'][index%4],shirt=bartender?cream:shirts[index%shirts.length];
 return [[0,.56,0,.5,.48,.3,shirt],[0,.3,0,.46,.16,.31,'#3c4546'],[-.14,.14,0,.18,.28,.21,'#424957'],[.14,.14,0,.18,.28,.21,'#424957'],[-.14,.035,.045,.24,.09,.32,dark],[.14,.035,.045,.24,.09,.32,dark],[-.34,.56,0,.16,.42,.22,shirt],[.34,.56,0,.16,.42,.22,shirt],[-.34,.31,.02,.15,.13,.19,skin],[.34,.31,.02,.15,.13,.19,skin],[0,1,0,.6,.58,.48,skin],[-.33,1,0,.09,.16,.17,skin],[.33,1,0,.09,.16,.17,skin],[0,1.3,-.02,.65,.14,.53,hair],[0,1.14,-.22,.64,.26,.12,hair],[-.24,1.18,.2,.14,.16,.12,hair],[-.13,1.04,.248,.055,.07,.035,'#352b2b'],[.13,1.04,.248,.055,.07,.035,'#352b2b'],[0,.89,.25,.13,.035,.025,'#a85d51'],[-.21,.95,.245,.08,.04,.02,'#d68d79'],[.21,.95,.245,.08,.04,.02,'#d68d79'],...(bartender?[[0,.5,.17,.33,.5,.035,teal] as Part,[0,.7,.18,.09,.09,.03,brass] as Part]:[])];
}
function Person({ guest }: {guest:Guest}) {
 const ref=useRef<THREE.Group>(null);const body=useMemo(()=>geometry(personParts(guest.customerId)),[guest.customerId]);const selected=useGame(s=>s.selected===guest.id);const setSelected=useGame(s=>s.select);
 useFrame(({clock},delta)=>{if(!ref.current)return;const target=new THREE.Vector3(...guestPosition(guest));ref.current.position.lerp(target,1-Math.exp(-delta*4));const moving=ref.current.position.distanceTo(target)>.05;ref.current.rotation.z=moving?Math.sin(clock.elapsedTime*9)*.045:Math.sin(clock.elapsedTime*1.5+guest.id)*.009;});
 const ready=['waiting','ready','ordered','pay'].includes(guest.status);
 return <group ref={ref} position={guestPosition(guest)}><mesh geometry={body} material={material} castShadow onClick={e=>{e.stopPropagation();setSelected(guest.id);}}/><Html position={[0,1.75,0]} center zIndexRange={[5,0]}><button className={'guest-bubble '+(selected?'selected ':'')+(ready?'attention':'')} onClick={()=>setSelected(guest.id)} aria-label={'Select '+guest.name}><span>{guest.status==='waiting'?'👋':guest.status==='reading'?'···':guest.status==='ready'?'✎':guest.status==='ordered'?'🍸':guest.status==='pay'?'$':'♡'}</span><small>{guest.name}</small></button></Html></group>;
}
function Bartender(){const ref=useRef<THREE.Group>(null);const body=useMemo(()=>geometry(personParts('bartender',true)),[]);useFrame(({clock},delta)=>{if(!ref.current)return;const s=useGame.getState();const task=s.tasks[0];const guest=task&&s.game.guests.find(g=>g.id===task.id);const target=guest?new THREE.Vector3(guestPosition(guest)[0],0,guest.status==='waiting'?3.3:1):new THREE.Vector3(0,.4,-2.9);ref.current.position.lerp(target,1-Math.exp(-delta*3));ref.current.rotation.z=task?Math.sin(clock.elapsedTime*10)*.04:0;});return <group ref={ref} position={[0,.4,-2.9]}><mesh geometry={body} material={material} castShadow/></group>;}
function Camera(){const {camera,size}=useThree();const panel=useGame(s=>s.panel);useFrame((_,dt)=>{const station=panel==='station';camera.position.lerp(new THREE.Vector3(station?6:11,station?8:13,station?9:16),1-Math.exp(-dt*4));const target=new THREE.Vector3(0,station?1:.7,station?-1.7:.3);camera.lookAt(target);if(camera instanceof THREE.OrthographicCamera){const zoom=Math.min(size.width/(station?6.3:16.5),size.height/(station?5.4:13));camera.zoom=THREE.MathUtils.damp(camera.zoom,zoom,4,dt);camera.updateProjectionMatrix();}});return null;}
function PreparationDisplay(){const selected=useGame(s=>s.selected);const p=useGame(s=>s.selected===-1?s.game.practice:s.game.guests.find(g=>g.id===selected)?.prep);if(!p)return null;const fill=Math.min(.4,volume(p)/200);return <group position={[.15,1.28,-1.7]}><mesh position={[0,.27,0]}><cylinderGeometry args={[.2,.16,.54,8]}/><meshStandardMaterial color="#c5d9cb" transparent opacity={.45}/></mesh>{fill>0&&<mesh position={[0,fill/2,0]}><cylinderGeometry args={[.18,.14,fill,8]}/><meshStandardMaterial color={p.amounts.sweet_red_vermouth?'#a7524b':p.amounts.fresh_lime_juice?'#cbd895':'#c78b49'}/></mesh>}{p.ice&&[0,1,2].map(i=><mesh key={i} position={[(i-1)*.09,.25+i*.03,0]} rotation={[.2,i,.3]}><boxGeometry args={[.12,.12,.12]}/><meshStandardMaterial color="#d0e9df" transparent opacity={.8}/></mesh>)}{p.garnish.cocktail_cherry>0&&<mesh position={[.13,.52,0]}><boxGeometry args={[.09,.09,.09]}/><meshStandardMaterial color="#b54556"/></mesh>}</group>;}

function Sign({lit}:{lit:boolean}){const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=180;const c=canvas.getContext('2d')!;c.fillStyle='#493830';c.fillRect(0,0,768,180);c.strokeStyle='#91b9a3';c.lineWidth=5;c.strokeRect(6,6,756,168);c.textAlign='center';c.fillStyle=lit?'#a8e3c9':'#aea28b';c.font='500 76px Fredoka, sans-serif';c.fillText('DIVE BAR',384,98);c.fillStyle='#e6cda1';c.font='20px sans-serif';c.fillText('GOOD DRINKS · BETTER STORIES',384,145);return new THREE.CanvasTexture(canvas)},[lit]);return <mesh position={[0,2.93,-4.12]}><planeGeometry args={[3.7,.87]}/><meshBasicMaterial map={texture}/></mesh>}
function Room(){const room=useMemo(()=>geometry(roomParts()),[]);const game=useGame(s=>s.game);const setPanel=useGame(s=>s.setPanel);return <><Camera/><color attach="background" args={['#29232c']}/><fog attach="fog" args={['#29232c',25,55]}/><ambientLight intensity={1.1} color="#ffe6c0"/><hemisphereLight args={['#ead9bd','#60473f',1.3]}/><directionalLight position={[3,10,5]} intensity={1.8} color="#ffddae" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9}/><mesh geometry={room} material={material} receiveShadow castShadow/>
 <Sign lit={game.upgrades.neon}/>
 <Html position={[0,1.7,-1.5]} center zIndexRange={[4,0]}><button className="station-label" onClick={()=>{if(useGame.getState().selected===null)useGame.getState().select(-1);setPanel('station');}}>THE COUNTER <span>↗</span></button></Html>
 <Bartender/>{game.guests.map(g=><Person guest={g} key={g.id}/>)}<PreparationDisplay/>
 {game.mess>0&&<mesh rotation={[-Math.PI/2,0,0]} position={[1,1.262,-1.5]}><circleGeometry args={[.15+game.mess*.03,12]}/><meshBasicMaterial color="#96573b" transparent opacity={.6}/></mesh>}
 {game.upgrades.plant&&<group position={[4.7,0,3.9]}><mesh position={[0,.25,0]}><boxGeometry args={[.6,.5,.6]}/><meshStandardMaterial color="#bc7960"/></mesh><mesh position={[0,.8,0]}><boxGeometry args={[.8,.65,.7]}/><meshStandardMaterial color="#7c9a65"/></mesh></group>}
 {game.upgrades.barback&&<group position={[3.9,0,-2.8]}><mesh geometry={geometry(personParts('helper'))} material={material}/></group>}
 <ContactShadows position={[0,-.13,0]} opacity={.24} scale={18} blur={2.5} far={4} resolution={256} frames={1}/>
 </>;}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?<div className="graphics-error"><h2>The lights won’t turn on.</h2><p>This game needs WebGL 2. Try an up-to-date browser with hardware acceleration enabled.</p></div>:this.props.children}}
export default function BarScene(){return <SceneBoundary><Canvas orthographic shadows dpr={[1,1.5]} camera={{position:[11,13,16],zoom:45,near:.1,far:100}} gl={{antialias:true,powerPreference:'high-performance'}}><Suspense fallback={null}><Room/></Suspense></Canvas></SceneBoundary>;}


import styled, { StyledComponent } from 'styled-components';
import { useState, useRef, useEffect, useCallback } from 'react';
import React from 'react';
import { quat, vec3, mat2d, vec2, mat2 } from 'gl-matrix';

interface CamInfo {
    perspective: number;
    x: number;
    y: number;
    z: number;
    rotation: quat;
    width: number;
    height: number;
}

// const...
const PLAYER_SPEED = 600;
const MOUSE_SENSITIVITY = 0.75;
const SQUARE_TRANSLATES = [
    quat.create(),
    quat.create()
];
quat.setAxisAngle(SQUARE_TRANSLATES[0], [1, 0, 0], Math.PI/2);
quat.setAxisAngle(SQUARE_TRANSLATES[1], [1, 0, 0], -Math.PI/2);

const ROTATE_TRANSLATE = quat.create();
quat.setAxisAngle(ROTATE_TRANSLATE, [0, 1, 0], Math.PI/4);

export const IndexPage: React.FC = () => {
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [z, setZ] = useState(300);
    const [yaw, setYaw] = useState(0); // 반시계방향!
    const [pitch, setPitch] = useState(0); // y축 방향으로

    const enpressedKeysRef = useRef<Set<string>>(new Set());
    const pressedKeysRef = useRef<Set<string>>(new Set());
    const unpressedKeysRef = useRef<Set<string>>(new Set());
    const mouseMovementRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    
    const containerRef = useRef<HTMLDivElement>(null);
    const pointerLockedRef = useRef(false);
    const dtRef = useRef(0); // Second

    const rotation = quat.create();
    quat.fromEuler(rotation, pitch * 180/Math.PI, yaw * 180/Math.PI, 0);

    const camInfo: CamInfo = {
        perspective: 500,
        x,
        y,
        z,
        rotation,
        width: innerWidth,
        height: innerHeight
    };


    useEffect(() => {
        const onPointerLockChange = () => {
            const pointerLockElement = ((document as any).pointerLockElement as (Element | null));
            pointerLockedRef.current = pointerLockElement === containerRef.current;
        }

        document.addEventListener('pointerlockchange', onPointerLockChange);
    }, []);

    useEffect(() => {
        let lastTime = performance.now();
        const intervalId = setInterval(() => {
            const newTime = performance.now();
            const dt = newTime - lastTime;
            dtRef.current = dt / 1000;

            update();
            enpressedKeysRef.current.clear();
            unpressedKeysRef.current.clear();
            mouseMovementRef.current.x = 0;
            mouseMovementRef.current.y = 0;

            lastTime = newTime;
        }, 10);

        return () => clearInterval(intervalId);
    }, []);

    const move = useCallback((direction: vec3, size: number) => {
        const movement = vec3.create();
        vec3.scale(movement, direction, size);
        setX(x => x + movement[0]);
        setY(y => y + movement[1]);
        setZ(z => z + movement[2]);
    }, []);


    const update = useCallback(() => {
        const dt = dtRef.current;

        // Move
        const pressedKeys = pressedKeysRef.current;
        if(pressedKeys.has('shift')) {
            move(vec3.fromValues(0, 1, 0), PLAYER_SPEED * dt);
        }
        if(pressedKeys.has(' ')) {
            move(vec3.fromValues(0, -1, 0), PLAYER_SPEED * dt);
        }
        setYaw(yaw => {
            const yawMat = mat2.create();
            mat2.fromRotation(yawMat, -yaw);

            const v = vec2.create();
            vec2.transformMat2(v, [
                pressedKeys.has('a') ? -1
                : pressedKeys.has('d') ? 1
                : 0
                ,
                pressedKeys.has('w') ? -1
                : pressedKeys.has('s') ? 1
                : 0
            ], yawMat);
            vec2.normalize(v, v);

            move([v[0], 0, v[1]], PLAYER_SPEED * dt);

            return yaw;
        });

        // Rotate
        const mouseMovement = mouseMovementRef.current;
        setYaw(yaw => yaw - dt*mouseMovement.x*MOUSE_SENSITIVITY);
        setPitch(pitch => Math.min(Math.PI/2, Math.max(-Math.PI/2, pitch + dt*mouseMovement.y*MOUSE_SENSITIVITY)));
    }, []);

    const onClick = useCallback(() => {
        containerRef.current!.focus();
        if(!pointerLockedRef.current)
           (containerRef.current! as any).requestPointerLock();
        else {

        }
    }, []);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if(pointerLockedRef.current) {
            const key = e.key.toLowerCase();
            enpressedKeysRef.current.add(key);
            pressedKeysRef.current.add(key);
        }
    }, []);

    const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if(pointerLockedRef.current) {
            const key = e.key.toLowerCase();
            unpressedKeysRef.current.add(key);
            pressedKeysRef.current.delete(key);
        }
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if(pointerLockedRef.current) {
            mouseMovementRef.current.x += e.movementX;
            mouseMovementRef.current.y += e.movementY;
        }
    }, []);

    return (
        <div
        style={{width: '100%', height: '100%'}}
        tabIndex={0}
        ref={containerRef}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onMouseMove={onMouseMove}
        >
            <Scene camInfo={camInfo}>
                <World1/>
            </Scene>
        </div>
    );
}
//transformOrigin={{ x: x, y: y, z: z }}>
const Scene: React.FC<{camInfo: CamInfo}> = ({ children, camInfo: { perspective, x, y, z, rotation, width, height } }) => {
    return (
        <div style={{width: '100%', height: '100%'}}>
            <View perspective={perspective}>
                <Transform x={width/2} y={height/2} z={perspective} rotation={rotation}> 
                    <Transform x={-x} y={-y} z={-z} rotation={quat.fromValues(0, 0, 0, 1)}>
                        {children}
                    </Transform>
                </Transform>
            </View>
        </div>
    )
};




const World1: React.FC = React.memo(() => {
    return (
        <>
            <Transform x={0} y={0} z={0} rotation={SQUARE_TRANSLATES[0]}><Square color="cyan" width={100} height={100}/></Transform>
            <Transform x={100} y={0} z={0} rotation={SQUARE_TRANSLATES[1]}><Square color="red" width={100} height={100}/></Transform>
            <Transform x={100} y={-100} z={0} rotation={SQUARE_TRANSLATES[1]}><Square color="orange" width={100} height={100}/></Transform>
            <Transform x={100} y={-200} z={0} rotation={SQUARE_TRANSLATES[1]}><Square color="yellow" width={100} height={100}/></Transform>
            <Transform x={100} y={-300} z={0} rotation={SQUARE_TRANSLATES[1]}><Square color="green" width={100} height={100}/></Transform>
            <Transform x={100} y={-400} z={0} rotation={SQUARE_TRANSLATES[1]}><Square color="blue" width={100} height={100}/></Transform>
            <Transform x={100} y={-500} z={0} rotation={SQUARE_TRANSLATES[1]}><Square color="purple" width={100} height={100}/></Transform>

            <Transform x={100} y={-100} z={-300} rotation={SQUARE_TRANSLATES[1]}><Square color="orange" width={100} height={100}/></Transform>
            <Transform x={100} y={-200} z={-300} rotation={SQUARE_TRANSLATES[1]}><Square color="yellow" width={100} height={100}/></Transform>
            <Transform x={100} y={-300} z={-300} rotation={SQUARE_TRANSLATES[1]}><Square color="green" width={100} height={100}/></Transform>
            <Transform x={100} y={-400} z={-300} rotation={SQUARE_TRANSLATES[1]}><Square color="blue" width={100} height={100}/></Transform>
            <Transform x={100} y={-500} z={-300} rotation={SQUARE_TRANSLATES[1]}><Square color="purple" width={100} height={100}/></Transform>

            <Transform x={200} y={0} z={100} rotation={SQUARE_TRANSLATES[0]}><h1 style={{ display: 'inline-block', width: '400px' }}>안녕하세요</h1></Transform>
            <Transform x={200} y={0} z={-200} rotation={SQUARE_TRANSLATES[0]}><Square color="purple" width={100} height={100}/></Transform>

            <Transform x={200} y={0} z={0} rotation={[0, 0, 0, 0]}>
                <Square color="purple" width={100} height={100}/>
                <Youtube videoId="0c9958OoTL8" width={600} height={300}/>
            </Transform>
            <Transform x={200} y={300} z={0} rotation={ROTATE_TRANSLATE}>
                <Square color="purple" width={100} height={100}/>
                <Youtube videoId="cFRNQOnzYGg" width={600} height={300}/>
            </Transform>
        </>
    );
});

const Square = styled.div(({ color, width, height }: { color: string, width: number, height: number }) => `
    background-color: ${color};
    width: ${width}px;
    height: ${height}px;
`);

const Transform: StyledComponent<"div", any, { x: number, y: number, z:number, rotation: quat, transformOrigin?: { x: number, y: number, z: number}}, "style"> = styled.div.attrs(({
    x, y, z, rotation, transformOrigin = { x: 0, y: 0, z: 0 } }:
    { x: number, y: number, z:number, rotation: quat, transformOrigin?: { x: number, y: number, z: number}}
) => {
    const reverseQuat = quat.create();
    quat.invert(reverseQuat, rotation);
    const axis = vec3.create();
    const angle = quat.getAxisAngle(axis, reverseQuat);

    return {
        style: {
            transformOrigin: `${transformOrigin.x}px ${transformOrigin.y}px ${transformOrigin.z}px`,
            transform: `translate3d(${x}px, ${y}px, ${z}px) rotate3d(${axis[0]}, ${axis[1]}, ${axis[2]}, ${angle}rad)`
        }
    };
})`
transform-style: preserve-3d;
position: absolute;
` as any;

const View = styled.div(({ perspective }: { perspective: number }) => `
perspective: ${perspective}px;
width: 100%;
height: 100%;
overflow: hidden;
position: relative;
`);

const Youtube: React.FC<{ videoId: string, width: number, height: number }> = ({ videoId, width, height }) => {
    return (
        <iframe width={width} height={height} src={`https://www.youtube.com/embed/${videoId}?wmode=transparent`} title="YouTube video player" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
    );
}
import { GameObjectPropsInterface, VoidFunction } from "./types";
import { BaseGameObject } from "./objects/BaseGameObject";
import { Level } from "./objects/Level";
import { Player } from "./objects/Player";
import { debounce } from "./lib/utils";
import { LivesDisplay } from "./objects/LivesDisplay";
import { LayerCollection } from "./lib/LayerCollection";
import { COLORS, MAX_ID } from "./CONSTS";

interface State {
  sceneType: SceneType;
  levelState?: LevelState;
  levelIdx?: number;
}

interface LevelState {
  idx: number;
  lives: number;
}

interface GamePropsInterface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  levels: typeof Level[];
  state?: State;
}

// scene types
export enum SceneType {
  LEVEL = "LEVEL",
  TITLE = "TITLE",
  WIN = "WIN",
  GAME_OVER = "GAME_OVER",
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  levels: typeof Level[];
  state: State;
  player: Player;

  private layerCollection: LayerCollection;
  private canvasRect: DOMRect;
  private running = true;
  private currLevel: Level;
  private objId = -1;
  private lastTime: number;

  constructor({
    canvas,
    ctx,
    levels,
    state = {
      /* 
    sceneType: SceneType.TITLE
    */
      sceneType: SceneType.LEVEL,
      levelState: {
        idx: 0,
        lives: 2,
      },
    },
  }: GamePropsInterface) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = state;
    this.levels = levels;
  }

  start() {
    // create player
    this.player = new Player(this.getDefaultProps());

    // cache canvas rect
    this.canvasRect = this.canvas.getBoundingClientRect();
    this.startScene();

    this.setListeners();

    this.lastTime = Date.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  startScene() {
    // clear layers
    this.layerCollection = new LayerCollection();

    switch (this.state.sceneType) {
      case SceneType.LEVEL:
        this.startLevel();
        break;
      case SceneType.LEVEL:
        this.startLevel();
        break;
    }
  }

  startLevel() {
    const { idx, lives } = this.state.levelState;

    this.currLevel = new this.levels[idx]({
      ...this.getDefaultProps(),
      x: 0,
      y: 0,
      w: 0.65,
      h: 0.65,
    });

    const livesDisplay = new LivesDisplay({
      ...this.getDefaultProps(),
      lives,
      x: -0.4,
      y: -0.4,
      w: 0.1,
      h: 0.1,
    });

    this.addObject(this.currLevel, 0);
    this.addObject(livesDisplay, 0);

    this.currLevel.initPlayerSpots();
    this.currLevel.setPlayer(this.player);
    this.currLevel.startSpawning();
  }

  addObject(obj: BaseGameObject, layer: number = 0) {
    if (obj.id === undefined) obj.id = this.getNewObjId();

    obj.setRenderedState(true);
    this.layerCollection.addObject(obj, layer);
    obj.initPoints();
    obj.setListeners();
    obj.setLayer(layer);

    for (let child of obj.children) {
      this.addObject(child, layer);
    }
  }

  removeObject(obj) {
    this.layerCollection.removeObject(obj);
    obj.removeListeners();

    for (let child of obj.children) {
      this.removeObject(child);
    }
  }

  // listeners
  handleMouse(e: MouseEvent) {
    if (!this.currLevel) return;
    this.currLevel.startUpdatingWithCursor(
      e.clientX - this.canvasRect.x,
      e.clientY - this.canvasRect.y
    );
  }

  handleMouseLeave() {
    if (!this.currLevel) return;
    this.currLevel.stopUpdatingWithCursor();
  }

  setListeners() {
    this.canvas.addEventListener("mouseenter", this.handleMouse.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouse.bind(this));
    this.canvas.addEventListener(
      "mouseleave",
      this.handleMouseLeave.bind(this)
    );

    const resizeHandler: VoidFunction = debounce(function () {
      // recache canvas rect
      this.canvasRect = this.canvas.getBoundingClientRect();
    }, 200);
    window.addEventListener("resize", resizeHandler);
  }

  gameLoop(time) {
    if (this.running) {
      // skip first cycle to initialize lastTime
      if (!this.lastTime) {
        this.lastTime = time;
      } else {
        const timeDelta = time - this.lastTime;
        this.lastTime = time;
        this.draw(timeDelta, time);
      }
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  draw(timeDelta: number, time: number) {
    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.layerCollection.applyFn((obj: BaseGameObject) => {
      obj._update(timeDelta, time);
      obj._render();
    });
  }

  updateState(newState: State) {
    let updateScene = newState.sceneType !== this.state.sceneType;
    this.state = newState;

    if (updateScene) {
      this.startScene();
    }
  }

  // util for getting default Game Object props
  getDefaultProps(): GameObjectPropsInterface {
    return {
      game: this,
      ctx: this.ctx,
      id: this.getNewObjId(),
    };
  }

  getNewObjId() {
    if (this.objId < MAX_ID) {
      this.objId += 1;
    } else {
      this.objId = 0;
    }
    return this.objId;
  }
}

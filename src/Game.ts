import { GameObjectPropsInterface, Scene, VoidFunction } from "./types";
import { BaseGameObject } from "./objects/BaseGameObject";
import { Level } from "./objects/Level";
import { Player } from "./objects/Player";
import { debounce } from "./lib/utils";
import { LivesDisplay } from "./objects/LivesDisplay";
import { LayerCollection } from "./lib/LayerCollection";
import { COLORS, MAX_ID } from "./CONSTS";
import merge from "lodash/fp/merge";
import { TextObject } from "./objects/TextObject";

interface State {
  sceneType?: SceneType;
  score?: number;
  levelState?: LevelState;
  levelStarted?: boolean;
}

interface LevelState {
  idx?: number;
  lives?: number;
}

interface GamePropsInterface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  levels: typeof Level[];
  title: Scene;
  win: Scene;
  gameOver: Scene;
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
  scoreText: TextObject;
  scoreValueText: TextObject;
  livesDisplay: LivesDisplay;
  lastTime: number;
  title: Scene;
  gameOver: Scene;
  win: Scene;
  // caching canvas DOMRect
  canvasRect: DOMRect;

  private layerCollection: LayerCollection;
  private running = true;
  private currLevel: Level;
  private objId = -1;

  static defaultState = {
    sceneType: SceneType.TITLE,
    score: 0,
    levelState: {
      idx: 0,
      lives: 2,
    },
    levelStarted: false,
  };

  constructor({
    canvas,
    ctx,
    levels,
    title,
    win,
    gameOver,
    state = Game.defaultState,
  }: GamePropsInterface) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = state;
    this.levels = levels;
    this.title = title;
    this.win = win;
    this.gameOver = gameOver;
  }

  start() {
    // create constant game objects
    this.scoreText = new TextObject({
      ...this.getDefaultProps(),
      text: "SCORE",
      x: 0.45,
      y: -0.43,
      h: 0.02,
      textBaseline: "top",
      textAlign: "end",
    });
    this.scoreValueText = new TextObject({
      ...this.getDefaultProps(),
      text: ("" + this.state.score).padStart(6, "0"),
      x: 0.45,
      y: -0.37,
      h: 0.03,
      textBaseline: "bottom",
      textAlign: "end",
    });

    // set text rendering props
    this.ctx.textAlign = "center";

    // cache canvas rect
    this.resizeCanvas();
    this.canvasRect = this.canvas.getBoundingClientRect();
    this.startScene();

    this.setListeners();

    this.lastTime = Date.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  clearLayers() {
    this.layerCollection?.applyFn((obj) => obj.destroy());
    this.layerCollection = new LayerCollection();
  }

  startScene() {
    this.clearLayers();
    switch (this.state.sceneType) {
      case SceneType.TITLE: {
        this.title(this);
        const clickListener = () => {
          this.updateState({
            sceneType: SceneType.LEVEL,
            levelState: {
              ...this.state.levelState,
              idx: 0,
            },
          });
          this.startScene();
          this.ctx.canvas.removeEventListener("click", clickListener, true);
        };
        this.ctx.canvas.addEventListener("click", clickListener, true);
        break;
      }
      case SceneType.WIN:
        this.showEndScreen(this.win);
        break;
      case SceneType.GAME_OVER:
        this.showEndScreen(this.gameOver);
        break;
      case SceneType.LEVEL:
        this.startLevel();
        break;
    }
  }

  showEndScreen(scene: Scene) {
    scene(this);
    const clickListener = () => {
      this.restart();
      this.ctx.canvas.removeEventListener("click", clickListener, true);
    };
    this.ctx.canvas.addEventListener("click", clickListener, true);
  }

  startLevel() {
    const { idx } = this.state.levelState;

    this.player = new Player(this.getDefaultProps());
    this.livesDisplay = new LivesDisplay({
      ...this.getDefaultProps(),
      lives: this.state.levelState.lives,
      x: -0.4,
      y: -0.4,
      w: 0.1,
      h: 0.1,
    });

    this.currLevel = new this.levels[idx]({
      ...this.getDefaultProps(),
      x: 0,
      y: 0,
      w: 0.65,
      h: 0.65,
    });

    this.addObject(this.currLevel, 0);
    this.addObject(this.livesDisplay, 1);
    this.addObject(this.scoreText, 1);
    this.addObject(this.scoreValueText, 1);

    this.currLevel.initPlayerSpots();
    this.currLevel.setPlayer(this.player);
    // only play animation on subsequent levels and only on start
    if (!this.state.levelStarted) {
      this.currLevel.startLevelStartAnim();
    } else {
      this.currLevel.startSpawning();
    }
    this.updateState({
      levelStarted: true,
    });
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

  updateScoreText() {
    this.scoreValueText.updateText(("" + this.state.score).padStart(6, "0"));
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

  handleTouchmove(e: TouchEvent) {
    if (!this.currLevel) return;
    this.currLevel.startUpdatingWithCursor(
      e.targetTouches[0].clientX - this.canvasRect.x,
      e.targetTouches[0].clientY - this.canvasRect.y
    );
  }

  handleMouseLeave() {
    if (!this.currLevel) return;
    this.currLevel.stopUpdatingWithCursor();
  }

  setListeners() {
    this.canvas.addEventListener(
      "mouseenter",
      this.handleMouse.bind(this),
      true
    );
    this.canvas.addEventListener(
      "mousemove",
      this.handleMouse.bind(this),
      true
    );
    this.canvas.addEventListener(
      "mouseleave",
      this.handleMouseLeave.bind(this),
      true
    );

    this.canvas.addEventListener(
      "touchmove",
      this.handleTouchmove.bind(this),
      true
    );

    const resizeHandler: VoidFunction = debounce(() => {
      // resize canvas
      this.resizeCanvas();
      this.recacheCanvasRect();
    }, 200);
    window.addEventListener("resize", resizeHandler);

    const scrollHandler: VoidFunction = debounce(() => {
      this.recacheCanvasRect();
    }, 200);
    window.addEventListener("scroll", scrollHandler);
  }

  recacheCanvasRect() {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  // resizing canvas based on responsize canvas#game sizes in CSS
  resizeCanvas() {
    if (window.innerWidth <= 400) {
      this.canvas.width = 300;
      this.canvas.height = 300;
    } else if (window.innerWidth <= 800) {
      this.canvas.width = 400;
      this.canvas.height = 400;
    } else {
      this.canvas.width = 750;
      this.canvas.height = 750;
    }
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
      obj.visible && obj._render();
    });
  }

  updateState(newState: State) {
    if (newState.score !== this.state.score) {
      this.updateScoreText();
    }
    if (
      newState.levelState &&
      newState.levelState.lives !== this.state.levelState.lives
    ) {
      this.livesDisplay.updateLives(newState.levelState.lives);
    }
    this.state = merge(this.state, newState);
  }

  hasWonGame(): boolean {
    return this.state.levelState.idx + 1 >= this.levels.length;
  }

  restart() {
    this.state = { ...Game.defaultState };
    this.startScene();
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

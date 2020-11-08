import { matrix } from "../matrix";
import {
  GameObjectPropsInterface,
  Point,
  TransformPropsInterface,
} from "../types";
import { Transform } from "./Transform";

export class BaseGameObject {
  ctx: CanvasRenderingContext2D;
  parent: BaseGameObject;
  children: BaseGameObject[] = [];
  transform: Transform;
  globalTransform: Transform;

  constructor(props: GameObjectPropsInterface) {
    Object.assign(this, props);
    this.transform = new Transform(props);
    this.updateGlobalTransform();
  }

  setParent(parent: BaseGameObject) {
    this.parent = parent;
    this.updateGlobalTransform();
  }

  addChildren(children: BaseGameObject[] | BaseGameObject) {
    if (!Array.isArray(children)) children = [children];
    for (let child of children) {
      child.setParent(this);
      this.children.push(child);
    }
  }

  updateTransformWithProps(props: TransformPropsInterface) {
    this.transform.updateWithProps(props);
    this.updateGlobalTransform();
  }

  // updates transformation matrix relative to whole canvas
  // and children's as well
  updateGlobalTransform() {
    this.globalTransform = new Transform();
    this.globalTransform.updateWithProps(this.transform.getTransformProps());

    if (this.parent) {
      // update global transform w/ parent's global transform
      const parentGlobalMat = this.parent.globalTransform.matrix;
      const parentGlobalProps = this.parent.globalTransform.getTransformProps();
      this.globalTransform.updateWithProps(parentGlobalProps);

      // TODO: fix parent-relative translation + rotation
      // when parent rotates, child should stay anchored w/ parent
      // however, child moves along one track when animating parent rotation
      const x = this.transform.x;
      const y = this.transform.y;
      // const r = Math.sqrt(x * x + y * y);
      // v1 = (r * cos(a1), r * sin(a1))
      // v2 = (r * cos(a2), r * sin(a2))
      // a2 = a1 + da
      // v2 - v1 = (r * (cos(a2) - cos(a1)), r * )
      const newTranslateX = parentGlobalMat[0] * x + parentGlobalProps.x;
      const newTranslateY = parentGlobalMat[4] * y + parentGlobalProps.y;
      this.globalTransform.matrix[6] = newTranslateX;
      this.globalTransform.matrix[7] = newTranslateY;
    }

    // and children's matrices
    for (let child of this.children) child.updateGlobalTransform();
  }

  normalizePoints(relX: number, relY: number): Point {
    return {
      x: this.ctx.canvas.width * (relX + 0.5),
      y: this.ctx.canvas.height * (relY + 0.5),
    };
  }

  localLineTo(localX: number, localY: number) {
    const resolved: Point = matrix.transformPoint(
      this.globalTransform.matrix,
      localX,
      localY
    );
    const normalized: Point = this.normalizePoints(resolved.x, resolved.y);
    this.ctx.lineTo(normalized.x, normalized.y);
  }

  localMoveTo(localX: number, localY: number) {
    const resolved: Point = matrix.transformPoint(
      this.globalTransform.matrix,
      localX,
      localY
    );
    const normalized: Point = this.normalizePoints(resolved.x, resolved.y);
    this.ctx.moveTo(normalized.x, normalized.y);
  }
}

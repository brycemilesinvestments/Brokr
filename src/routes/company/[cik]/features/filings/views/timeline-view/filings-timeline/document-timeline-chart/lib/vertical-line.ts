import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type {
  Coordinate,
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesOptionsMap,
  SeriesType,
  Time,
} from "lightweight-charts";
import { positionsLine } from "./positions-line";

export type VertLineOptions = {
  color: string;
  width: number;
};

const defaultOptions: VertLineOptions = {
  color: "#71717a",
  width: 2,
};

class VertLinePaneRenderer implements IPrimitivePaneRenderer {
  constructor(
    private readonly x: Coordinate | null,
    private readonly options: VertLineOptions,
  ) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (this.x === null) return;

      const ctx = scope.context;
      const position = positionsLine(this.x, scope.horizontalPixelRatio, this.options.width);
      ctx.fillStyle = this.options.color;
      ctx.fillRect(position.position, 0, position.length, scope.bitmapSize.height);
    });
  }
}

class VertLinePaneView implements IPrimitivePaneView {
  private x: Coordinate | null = null;

  constructor(
    private readonly source: VertLine,
    private readonly options: VertLineOptions,
  ) {}

  update() {
    const timeScale = this.source.chart.timeScale();
    this.x = timeScale.timeToCoordinate(this.source.time);
  }

  renderer() {
    return new VertLinePaneRenderer(this.x, this.options);
  }

  zOrder() {
    return "bottom" as const;
  }
}

export class VertLine implements ISeriesPrimitive<Time> {
  readonly chart: IChartApi;
  readonly series: ISeriesApi<SeriesType>;
  readonly time: Time;
  private readonly _paneViews: VertLinePaneView[];

  constructor(
    chart: IChartApi,
    series: ISeriesApi<keyof SeriesOptionsMap>,
    time: Time,
    options?: Partial<VertLineOptions>,
  ) {
    const vertLineOptions: VertLineOptions = {
      ...defaultOptions,
      ...options,
    };
    this.chart = chart;
    this.series = series;
    this.time = time;
    this._paneViews = [new VertLinePaneView(this, vertLineOptions)];
  }

  updateAllViews() {
    this._paneViews.forEach((paneView) => paneView.update());
  }

  paneViews() {
    return this._paneViews;
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 160;
const LABEL_AREA_HEIGHT = 28;
const MAX_BAR_WIDTH = 48;
const BAR_WIDTH_RATIO = 0.6;

/**
 * Reusable, dependency-free bar chart. Renders raw SVG using the
 * app's existing CSS variable tokens (var(--color-primary), etc.), so
 * dark mode is inherited automatically with zero extra theming code.
 *
 * Uses a FIXED logical viewBox width (CHART_WIDTH) combined with
 * preserveAspectRatio="none" and an explicit CSS pixel height on the
 * <svg> element. This deliberately decouples horizontal scaling (bars
 * always spread across whatever width the container renders at) from
 * vertical scaling (chart height never changes). The previous
 * "xMidYMid meet" + height:auto approach derived height purely from
 * the viewBox's own aspect ratio, which blew up to an enormous height
 * whenever there were only 1-2 data points, since a narrow viewBox
 * stretched to a wide container preserves aspect ratio by growing
 * height dramatically.
 *
 * Approved as "Option A" for Phase 6 to avoid adding a charting
 * dependency (Chart.js/ngx-charts) for a single bar-chart use case.
 */
@Component({
  imports: [CommonModule],
  selector: 'app-bar-chart',
  styleUrl: './bar-chart.component.scss',
  templateUrl: './bar-chart.component.html',
})
export class BarChartComponent {
  @Input() labels: string[] = [];
  @Input() values: number[] = [];
  @Input() valueSuffix = 'h';
  @Input() valueDecimals = 1;

  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;
  readonly totalHeight = CHART_HEIGHT + LABEL_AREA_HEIGHT;

  get maxValue(): number {
    return Math.max(...this.values, 1);
  }

  private get slotWidth(): number {
    return this.chartWidth / Math.max(this.labels.length, 1);
  }

  get barWidth(): number {
    return Math.min(this.slotWidth * BAR_WIDTH_RATIO, MAX_BAR_WIDTH);
  }

  barX(index: number): number {
    return index * this.slotWidth + (this.slotWidth - this.barWidth) / 2;
  }

  barHeight(value: number): number {
    return Math.max((value / this.maxValue) * this.chartHeight, 2);
  }

  barY(value: number): number {
    return this.chartHeight - this.barHeight(value);
  }

  labelX(index: number): number {
    return index * this.slotWidth + this.slotWidth / 2;
  }

  formattedValue(value: number): string {
    return `${value.toFixed(this.valueDecimals)}${this.valueSuffix}`;
  }
}
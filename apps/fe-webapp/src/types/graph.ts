/**
 * Types for D3 force-directed graph
 */

import * as d3 from 'd3';

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  category?: string;
  created_at?: string;
  color?: string;
  size?: number;
  // D3 simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface D3Edge extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  weight: number;
  strength?: number;
}

export interface GraphData {
  nodes: D3Node[];
  edges: D3Edge[];
}
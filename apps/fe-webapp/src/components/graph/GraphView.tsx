'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Network, FileText, Move, ZoomIn, Hand, ZoomOut, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { fetchGraphData } from '@/services/services/ragService';
import type { D3Node, D3Edge } from '@/types/graph';
import { 
  APP_CONFIG, 
  UI_MESSAGES, 
  PILLAR_COLORS,
  PILLAR_COLORS_SVG,
  D3_SIMULATION,
  D3_ZOOM,
  ANIMATION_DURATION,
  UI_DIMENSIONS,
} from '@/constants';

// Colors for the graph
const GRAPH_COLORS = {
  memory: '#8B5CF6',    // Violet for memories
  note: '#3B82F6',      // Blue for notes
  tag: '#10B981',       // Green for tags
  edge: '#6366F1',      // Indigo for connections
  edgeWeak: '#4B5563',  // Gray for weak connections
  text: '#E5E7EB',      // Light gray for text
  textMuted: '#9CA3AF', // Gray for secondary text
  background: '#0A0A0A', // Dark background
  cardBg: '#18181B',    // Card background
  border: '#27272A',    // Borders
};

// Colores para las categorías del RAG
const CATEGORY_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', 
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4', 
  '#84CC16', '#F97316', '#6366F1', '#14B8A6',
];

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  tags: string[];
  pillar: string;
  type?: 'note' | 'memory' | 'rag';
  category?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphViewProps {
  onNewNode?: (nodeData: NewNodeData) => void;
  newNodeToAdd?: NewNodeData | null;
}

const GraphView: React.FC<GraphViewProps> = ({ onNewNode, newNodeToAdd }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('nodes');
  const [mounted, setMounted] = useState(false);
  const [isLoadingRAG, setIsLoadingRAG] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragNodes, setRagNodes] = useState<D3Node[]>([]);
  const [categoryColorMap, setCategoryColorMap] = useState<Map<string, string>>(new Map());

  // Update dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const isDarkMode = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  // Cargar datos del RAG API
  const loadRAGData = useCallback(async () => {
    setIsLoadingRAG(true);
    setRagError(null);
    try {
      const data = await fetchGraphData(500);
      
      // Construir mapa de colores por categoría
      const categories = new Set<string>();
      data.nodes.forEach(node => {
        if (node.category) {
          categories.add(node.category);
        }
      });

      const colorMap = new Map<string, string>();
      Array.from(categories).forEach((category, index) => {
        colorMap.set(category, CATEGORY_COLORS[index % CATEGORY_COLORS.length]);
      });
      setCategoryColorMap(colorMap);

      // Transformar nodos del API al formato GraphNode
      const transformedNodes: D3Node[] = data.nodes.map(node => ({
        ...node,
        color: node.category && colorMap.has(node.category) 
          ? colorMap.get(node.category) 
          : '#8B5CF6',
        size: node.type === 'memory' ? 8 : 10,
      }));

      setRagNodes(transformedNodes);
    } catch (err) {
      console.error('Error loading RAG graph data:', err);
      setRagError('No se pudo cargar datos del grafo RAG. Verifica que el API esté activo.');
    } finally {
      setIsLoadingRAG(false);
    }
  }, []);

  // Cargar datos RAG al montar el componente
  useEffect(() => {
    loadRAGData();
  }, [loadRAGData]);

  // Generar nodos y conexiones basadas en tags, referencias y datos RAG
  const { nodes, links } = useMemo(() => {
    // Usar dimensiones por defecto para la distribución inicial
    // Se ajustarán dinámicamente cuando se monte el componente
    const defaultWidth = APP_CONFIG.GRAPH_VIEWBOX_WIDTH;
    const defaultHeight = APP_CONFIG.GRAPH_VIEWBOX_HEIGHT;
    const centerX = defaultWidth / 2;
    const centerY = defaultHeight / 2;
    const totalNodes = notes.length + ragNodes.length;
    const radius = Math.min(defaultWidth, defaultHeight) * 0.3; // 30% del tamaño menor
    
    // Nodos locales del store
    const localNodes: GraphNode[] = notes.map((note, index) => {
      // Distribución circular inicial para mejor visualización
      const angle = (index / totalNodes) * D3_SIMULATION.FULL_CIRCLE_RADIANS;
      const x = Math.cos(angle) * radius + centerX;
      const y = Math.sin(angle) * radius + centerY;

      return {
        id: note.id,
        x,
        y,
        title: note.title,
        tags: note.tags,
        pillar: note.pillar,
        type: 'note',
      };
    });

    // Nodos del RAG API
    const ragGraphNodes: GraphNode[] = ragNodes.map((node, index) => {
      const adjustedIndex = notes.length + index;
      const angle = (adjustedIndex / totalNodes) * D3_SIMULATION.FULL_CIRCLE_RADIANS;
      const x = Math.cos(angle) * radius + centerX;
      const y = Math.sin(angle) * radius + centerY;

      return {
        id: `rag-${node.id}`,
        x,
        y,
        title: node.label,
        tags: [],
        pillar: 'default',
        type: 'rag',
        category: node.category,
      };
    });

    const graphNodes = [...localNodes, ...ragGraphNodes];
    const graphLinks: GraphLink[] = [];
    
    // Crear conexiones basadas en tags compartidos (solo para notas locales)
    notes.forEach((note, i) => {
      notes.slice(i + 1).forEach((otherNote) => {
        const sharedTags = note.tags.filter((tag) =>
          otherNote.tags.includes(tag),
        );
        if (sharedTags.length > 0) {
          graphLinks.push({
            source: note.id,
            target: otherNote.id,
          });
        }
      });

      const colorMap = new Map<string, string>();
      Array.from(categories).forEach((category, index) => {
        colorMap.set(category, CATEGORY_COLORS[index % CATEGORY_COLORS.length]);
      });
      setCategoryColorMap(colorMap);

    return { nodes: graphNodes, links: graphLinks };
  }, [notes, ragNodes]);

      const edges: D3Edge[] = data.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        strength: edge.weight * 0.5, // Scale weight to strength
      }));

      setGraphData({ nodes, edges });
      setStats({
        nodeCount: data.metadata.node_count,
        edgeCount: data.metadata.edge_count,
      });
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError('Failed to load graph data. Make sure the RAG API is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Get node color based on type and category
  const getNodeColor = (type: string, category?: string, colorMap?: Map<string, string>): string => {
    // If there's a category and we have a color mapping, use it
    if (category && colorMap && colorMap.has(category)) {
      return colorMap.get(category)!;
    }
    
    // Fallback to type-based colors
    if (type === 'memory') return GRAPH_COLORS.memory;
    if (type === 'note') return GRAPH_COLORS.note;
    if (type === 'tag') return GRAPH_COLORS.tag;
    return GRAPH_COLORS.memory;
  };

  // Get node size based on type
  const getNodeSize = (type: string): number => {
    if (type === 'memory') return 8;
    if (type === 'note') return 10;
    if (type === 'tag') return 6;
    return 8;
  };

  // Initialize D3 force simulation and render
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Calculate initial zoom based on number of nodes
    const nodeCount = graphData.nodes.length;
    let initialScale = 1;
    
    if (nodeCount > 100) {
      initialScale = 0.3;
    } else if (nodeCount > 50) {
      initialScale = 0.5;
    } else if (nodeCount > 30) {
      initialScale = 0.7;
    } else if (nodeCount > 10) {
      initialScale = 0.85;
    }

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Apply initial zoom
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale)
      .translate(-width / 2, -height / 2);
    
    svg.call(zoom.transform, initialTransform);

    // Find the new node to center on it
    const newNode = graphData.nodes.find(n => n.id === newNodeId);
    const centerX = newNode && newNode.x ? newNode.x : width / 2;
    const centerY = newNode && newNode.y ? newNode.y : height / 2;

    // Dibujar nodos con colores mejorados para dark mode
    const nodeElements = nodeGroup
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => d.type === 'rag' ? 8 : APP_CONFIG.GRAPH_NODE_RADIUS)
      .attr('fill', (d) => {
        // Si es un nodo del RAG, usar color de categoría
        if (d.type === 'rag' && d.category) {
          return categoryColorMap.get(d.category) || '#8B5CF6';
        }
        // Si es una nota local, usar colores de pillar
        const pillar = d.pillar as keyof typeof PILLAR_COLORS_SVG;
        const colors = PILLAR_COLORS_SVG[pillar] ?? PILLAR_COLORS_SVG.default;
        return isDarkMode ? colors.dark : colors.light;
      })
      .attr('stroke', (d) => {
        if (d.type === 'rag') {
          return '#fff';
        }
        const pillar = d.pillar as keyof typeof PILLAR_COLORS_SVG;
        const colors = PILLAR_COLORS_SVG[pillar] ?? PILLAR_COLORS_SVG.default;
        return isDarkMode ? colors.dark : colors.light;
      })
      .attr('stroke-width', (d) => d.type === 'rag' ? '2' : (isDarkMode ? '2' : '1'))
      .attr('class', (d) => {
        const cursorClass = interactionMode === 'nodes' ? 'cursor-move' : 'cursor-pointer';
        return `${cursorClass} transition-all hover:opacity-80`;
      })
      .style('filter', isDarkMode ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))' : 'none')
      .call(nodeDrag)
      .on('click', (event, d) => {
        event.stopPropagation();
        if (interactionMode === 'nodes' && d.type !== 'rag') {
          handleNodeClick(d.id);
        }
        return d.size || 8;
      })
      .attr('fill', d => d.color || GRAPH_COLORS.memory)
      .attr('stroke', d => d.id === newNodeId ? '#FFD700' : '#fff')
      .attr('stroke-width', d => d.id === newNodeId ? 6 : 2)
      .style('cursor', 'pointer')
      .style('filter', d => d.id === newNodeId ? 'drop-shadow(0 0 20px #FFD700)' : 'none')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(drag(simulation) as any);

    // Add pulse animation to new node
    if (newNodeId) {
      node.filter(d => d.id === newNodeId)
        .transition()
        .duration(600)
        .attr('r', d => (d.size || 8) * 4)
        .transition()
        .duration(600)
        .attr('r', d => (d.size || 8) * 3)
        .transition()
        .duration(600)
        .attr('r', d => (d.size || 8) * 3.5)
        .transition()
        .duration(600)
        .attr('r', d => (d.size || 8) * 3);
    }

    // Add labels
    const label = g.append('g')
      .selectAll('text')
      .data(graphData.nodes)
      .join('text')
      .text(d => d.label.length > 30 ? d.label.substring(0, 30) + '...' : d.label)
      .attr('font-size', d => d.id === newNodeId ? 14 : 10)
      .attr('font-weight', d => d.id === newNodeId ? 'bold' : 'normal')
      .attr('dx', d => d.id === newNodeId ? 18 : 12)
      .attr('dy', 4)
      .attr('fill', d => d.id === newNodeId ? '#FFD700' : GRAPH_COLORS.text)
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Add hover effects
    node
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', (d.size || 8) * 1.5)
          .attr('stroke-width', 3);

        // Highlight connected edges
        link
          .transition()
          .duration(200)
          .attr('stroke-opacity', l => {
            const source = typeof l.source === 'object' ? l.source.id : l.source;
            const target = typeof l.target === 'object' ? l.target.id : l.target;
            return (source === d.id || target === d.id) ? 0.8 : 0.1;
          });
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d.size || 8)
          .attr('stroke-width', 2);

        // Reset edge opacity
        link
          .transition()
          .duration(200)
          .attr('stroke-opacity', l => 0.3 + (l.weight * 0.5));
      })
      .on('click', function(event, d) {
        console.log('Clicked node:', d);
        // TODO: Add navigation or detail view
      });

    // Update positions on simulation tick
    let tickCount = 0;
    simulation.on('tick', () => {
      link
        .attr('x1', d => (typeof d.source === 'object' ? d.source.x : 0) || 0)
        .attr('y1', d => (typeof d.source === 'object' ? d.source.y : 0) || 0)
        .attr('x2', d => (typeof d.target === 'object' ? d.target.x : 0) || 0)
        .attr('y2', d => (typeof d.target === 'object' ? d.target.y : 0) || 0);

      node
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);

      label
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0);

      // Center on new node after simulation stabilizes
      tickCount++;
      if (newNodeId && tickCount === 50) {
        const newNode = graphData.nodes.find(n => n.id === newNodeId);
        if (newNode && newNode.x !== undefined && newNode.y !== undefined) {
          console.log('Centering on new node at:', newNode.x, newNode.y);
          
          // Calculate transform to center the new node
          const scale = initialScale * 1.5; // Zoom in a bit more
          const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-newNode.x, -newNode.y);
          
          // Animate to the new position
          svg.transition()
            .duration(1000)
            .call(zoom.transform, transform);
        }
      }
    });

    // Drag behavior
    function drag(simulation: d3.Simulation<D3Node, D3Edge>) {
      function dragstarted(event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag<SVGCircleElement, D3Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, interactionMode, isDarkMode, categoryColorMap]);


  const handleRefresh = () => {
    loadGraphData();
  };

  // Function to add a new node dynamically
  const addNewNode = useCallback((nodeData: NewNodeData) => {
    setGraphData(prevData => {
      // Check if node already exists
      if (prevData.nodes.find(n => n.id === nodeData.node.id)) {
        console.log('Node already exists, skipping');
        return prevData;
      }

      // Get or create color for category
      const updatedColorMap = new Map(categoryColorMap);
      if (nodeData.node.category && !updatedColorMap.has(nodeData.node.category)) {
        updatedColorMap.set(
          nodeData.node.category,
          CATEGORY_COLORS[updatedColorMap.size % CATEGORY_COLORS.length]
        );
        setCategoryColorMap(updatedColorMap);
      }

      // Create new D3 node
      const newD3Node: D3Node = {
        ...nodeData.node,
        color: getNodeColor(nodeData.node.type, nodeData.node.category, updatedColorMap),
        size: getNodeSize(nodeData.node.type),
        // Position near center for animation
        x: dimensions.width / 2,
        y: dimensions.height / 2,
      };

      // Create new edges
      const newEdges: D3Edge[] = nodeData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        strength: edge.weight * 0.5,
      }));

      // Filter out edges where target nodes don't exist
      const validEdges = newEdges.filter(edge => {
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        return prevData.nodes.find(n => n.id === targetId);
      });

      // Update stats
      setStats(prev => ({
        nodeCount: prev.nodeCount + 1,
        edgeCount: prev.edgeCount + validEdges.length,
      }));

      // Mark this as the new node for animation
      setNewNodeId(nodeData.node.id);
      
      // Clear the highlight after animation (increased time)
      setTimeout(() => setNewNodeId(null), 10000);

      return {
        nodes: [...prevData.nodes, newD3Node],
        edges: [...prevData.edges, ...validEdges],
      };
    });
  }, [categoryColorMap, dimensions, getNodeColor, getNodeSize]);

  // Expose addNewNode function via callback
  useEffect(() => {
    if (onNewNode) {
      // This is a workaround to expose the function
      // In a real app, you'd use a ref or context
      (window as unknown as { addGraphNode?: (nodeData: NewNodeData) => void }).addGraphNode = addNewNode;
    }
  }, [addNewNode, onNewNode]);

  // Check for pending graph node after navigation
  useEffect(() => {
    const windowWithGraph = window as unknown as { 
      addGraphNode?: (nodeData: NewNodeData) => void;
      pendingGraphNode?: NewNodeData;
    };
    
    // Check if there's a pending node to add
    if (windowWithGraph.pendingGraphNode && graphData.nodes.length > 0) {
      const pendingNode = windowWithGraph.pendingGraphNode;
      
      // Add the node after a short delay to ensure graph is rendered
      setTimeout(() => {
        addNewNode(pendingNode);
        // Clear the pending node
        delete windowWithGraph.pendingGraphNode;
      }, 500);
    }
  }, [graphData.nodes.length, addNewNode]);

  // Add new node from prop
  useEffect(() => {
    if (newNodeToAdd && graphData.nodes.length > 0) {
      console.log('New node to add:', newNodeToAdd.node.id);
      // Check if node doesn't already exist
      const nodeExists = graphData.nodes.find(n => n.id === newNodeToAdd.node.id);
      if (!nodeExists) {
        console.log('Adding new node to graph');
        setTimeout(() => {
          addNewNode(newNodeToAdd);
        }, 500);
      } else {
        console.log('Node already exists, setting as new node');
        setNewNodeId(newNodeToAdd.node.id);
        setTimeout(() => setNewNodeId(null), 10000);
      }
    }
  }, [newNodeToAdd, graphData.nodes.length, graphData.nodes, addNewNode]);

  // Loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center" style={{ backgroundColor: GRAPH_COLORS.background }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: GRAPH_COLORS.textMuted }} className="text-sm">Loading graph...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center" style={{ backgroundColor: GRAPH_COLORS.background }}>
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" className="bg-violet-600 hover:bg-violet-700 text-white border-violet-500">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 relative" style={{ backgroundColor: GRAPH_COLORS.background }}>


      {/* Graph Info */}
      <div
        className="absolute top-4 left-4 z-10 p-4 rounded-xl border"
        style={{ backgroundColor: GRAPH_COLORS.cardBg, borderColor: GRAPH_COLORS.border }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: GRAPH_COLORS.text }}>
          Memory Graph
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {/* Botón de refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadRAGData}
              disabled={isLoadingRAG}
              title="Recargar datos del grafo RAG"
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingRAG ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isLoadingRAG ? 'Cargando...' : 'Actualizar RAG'}
              </span>
            </Button>

            <div className="flex rounded-lg border bg-card p-1">
              <Button
                variant={interactionMode === 'nodes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInteractionMode('nodes')}
                title="Modo: Arrastrar nodos"
                className="gap-1.5"
              >
                <Move className="h-4 w-4" />
                <span className="hidden sm:inline">Nodos</span>
              </Button>
              <Button
                variant={interactionMode === 'pan' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInteractionMode('pan')}
                title="Modo: Mover canvas"
                className="gap-1.5"
              >
                <Hand className="h-4 w-4" />
                <span className="hidden sm:inline">Mover</span>
              </Button>
              <Button
                variant={interactionMode === 'zoom' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInteractionMode('zoom')}
                title="Modo: Zoom y navegación"
                className="gap-1.5"
              >
                <ZoomIn className="h-4 w-4" />
                <span className="hidden sm:inline">Zoom</span>
              </Button>
            </div>
            
            {/* Controles de zoom */}
            <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleZoomOut}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleZoomIn}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                title="Resetear zoom y posición"
                className="gap-1.5"
              >
                <span className="text-xs">Reset</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Categories Legend */}
        {categoryColorMap.size > 0 && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: GRAPH_COLORS.border }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: GRAPH_COLORS.text }}>
              Categories
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {Array.from(categoryColorMap.entries()).map(([category, color]) => (
                <div key={category} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs truncate" style={{ color: GRAPH_COLORS.textMuted }}>
                    {category || 'Uncategorized'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs" style={{ color: GRAPH_COLORS.textMuted }}>
          Drag nodes to rearrange
        </p>
        <p className="text-xs" style={{ color: GRAPH_COLORS.textMuted }}>
          Scroll to zoom, drag to pan
        </p>
      </div>

      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-muted/30 dark:bg-muted/20 min-h-0">
        <svg
          ref={svgRef}
          className="h-full w-full"
          viewBox={`0 0 ${APP_CONFIG.GRAPH_VIEWBOX_WIDTH} ${APP_CONFIG.GRAPH_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Legend - Ajustado para no salirse de la pantalla */}
        <div className="absolute bottom-4 left-4 max-h-[calc(100%-8rem)] overflow-y-auto rounded-lg border bg-card p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Leyenda</h3>
          
          {/* Notas locales */}
          <div className="space-y-1 text-xs mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notas Locales</p>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${PILLAR_COLORS.career}`} />
              <span>Desarrollo de Carrera</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${PILLAR_COLORS.social}`} />
              <span>Social</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${PILLAR_COLORS.hobby}`} />
              <span>Hobby</span>
            </div>
          </div>

          {/* Categorías RAG */}
          {categoryColorMap.size > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Memorias RAG ({ragNodes.length})
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {Array.from(categoryColorMap.entries()).map(([category, color]) => (
                  <div key={category} className="flex items-center gap-2">
                    <div 
                      className="h-2.5 w-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: color }} 
                    />
                    <span className="text-xs truncate">
                      {category || 'Sin categoría'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mostrar error si existe */}
          {ragError && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-destructive">{ragError}</p>
            </div>
          )}
        </div>

        {/* Node list - Ajustado para no salirse de la pantalla */}
        <div className="absolute right-4 top-4 max-h-[calc(100%-2rem)] w-64 overflow-y-auto rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">
            Nodos ({nodes.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {notes.length} locales · {ragNodes.length} RAG
          </p>
          <div className="space-y-1">
            {nodes.filter(n => n.type !== 'rag').map((node) => (
              <Button
                key={node.id}
                variant="ghost"
                className="w-full justify-start text-xs h-auto py-1.5"
                onClick={() => handleNodeClick(node.id)}
              >
                <FileText className="mr-2 h-3 w-3" />
                <span className="truncate">{node.title}</span>
              </Button>
            ))}
            {nodes.filter(n => n.type === 'rag').length > 0 && (
              <>
                <div className="my-2 border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Memorias RAG
                  </p>
                </div>
                {nodes.filter(n => n.type === 'rag').slice(0, 10).map((node) => (
                  <div
                    key={node.id}
                    className="flex items-start gap-2 px-2 py-1.5 text-xs text-muted-foreground"
                  >
                    <div 
                      className="h-2 w-2 rounded-full shrink-0 mt-1" 
                      style={{ 
                        backgroundColor: node.category && categoryColorMap.has(node.category)
                          ? categoryColorMap.get(node.category)
                          : '#8B5CF6'
                      }} 
                    />
                    <span className="truncate">{node.title}</span>
                  </div>
                ))}
                {nodes.filter(n => n.type === 'rag').length > 10 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">
                    +{nodes.filter(n => n.type === 'rag').length - 10} más...
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphView;

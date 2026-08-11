/**
 * Primitivas de interfaz de ELÍGEME.
 *
 * Punto único de importación. Si un color, un radio o una altura hace
 * falta en dos sitios, vive aquí y no en la pantalla que lo necesitó
 * primero. Esa era la causa de que hubiera cinco paletas distintas.
 */

export { default as Modal } from './Modal';
export { default as Button } from './Button';
export { default as Badge, StatusDot } from './Badge';
export { default as EmptyState } from './EmptyState';
export { Card, CardHeader, CardBody, SectionTitle } from './Card';
export { StatCard, Dato, SinRegistrar } from './Stat';
export { Meter, BarList, OrdinalSplit } from './Meter';
export { Field, Input, Select, Textarea, SearchInput } from './Field';
export { Table, Th, Td, Tr } from './Table';
export {
  Skeleton,
  LoadingRegion,
  StatCardSkeleton,
  StatGridSkeleton,
  ChartSkeleton,
  TableSkeleton,
  CardGridSkeleton,
  ListSkeleton
} from './Skeleton';

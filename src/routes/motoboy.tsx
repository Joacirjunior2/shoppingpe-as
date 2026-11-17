import { createFileRoute } from '@tanstack/react-router';
import MotoboyScreen from '../components/MotoboyScreen';

export const Route = createFileRoute('/motoboy')({
  component: MotoboyRoute,
});

function MotoboyRoute() {
  return <MotoboyScreen />;
}

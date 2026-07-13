@keyframes blinky {
  from { box-shadow: 0 0 5px hsl(0, 0%, 100%, 0); }
  to { box-shadow: 0 0 5px 5px hsl(3, 0%, 80%, .5); }
}

.cu-moodle-anim-toggle {
  animation: blinky 350ms ease-out infinite alternate;
  animation-iteration-count: 8;
}
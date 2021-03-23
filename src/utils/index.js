export const showKeyPoints = (ctx, points = [], color = '#32EEDB') => {
    ctx.fillStyle = color;
    for (let i = 0; i < points.length; i++) {
      const x = points[i][0];
      const y = points[i][1];
      ctx.beginPath();
      ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
      ctx.fill();
    }
  };
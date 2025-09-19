import React, { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const [kv, setKv] = useState(75);
  const [ma, setMa] = useState(50);
  const [inputKv, setInputKv] = useState(75);
  const [inputMa, setInputMa] = useState(50);
  const [inputMs, setInputMs] = useState(1000);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [btnSetText, setBtnSetText] = useState("Set");
  const [btnSetColor, setBtnSetColor] = useState("initialColor");
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });

  const drag = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const img = useRef(new Image());
  const scaleRef = useRef(1);
  const [selectedImage, setSelectedImage] = useState("http://192.168.2.105:3001/api/abdomen");

  // Estados para recorte
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null); // {x, y, w, h}

  // Imagen original para resetear
  const originalImage = useRef(null);

  useEffect(() => {
    img.current = new Image();
    img.current.crossOrigin = "anonymous";
    img.current.src = selectedImage;
    img.current.onload = () => {
      const canvas = canvasRef.current;
      const maxWidth = window.innerWidth * 0.9;
      let scale = 1;
      if (img.current.width > maxWidth) {
        scale = maxWidth / img.current.width;
      }
      scaleRef.current = scale;
      canvas.width = img.current.width * scale;
      canvas.height = img.current.height * scale;
      const startX = (canvas.width - img.current.width * scale) / 2;
      const startY = (canvas.height - img.current.height * scale) / 2;
      setImgPos({ x: startX, y: startY });
      setImageLoaded(true);

      // Guardar copia original
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img.current, 0, 0, canvas.width, canvas.height);
      originalImage.current = canvas.toDataURL();
    };
  }, [selectedImage]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = scaleRef.current;
    ctx.save();
    ctx.scale(scale, scale);
    const brightness = ma / 50;
    const contrast = Math.min(3, Math.max(0.1, 120 / kv));
    ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
    ctx.drawImage(img.current, imgPos.x / scale, imgPos.y / scale);
    ctx.restore();

    // Dibujar selección si existe
    if (selection) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.setLineDash([6]);
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    if (!imageLoaded) return;
    drawImage();
    const handleResize = () => {
      drawImage();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [kv, ma, imgPos, imageLoaded, selection]);

  const onMouseDown = (e) => {
    if (e.shiftKey) {
      // iniciar selección
      const rect = canvasRef.current.getBoundingClientRect();
      setIsSelecting(true);
      setSelection({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
    } else {
      // mover imagen
      drag.current.dragging = true;
      drag.current.startX = e.clientX;
      drag.current.startY = e.clientY;
      drag.current.originX = imgPos.x;
      drag.current.originY = imgPos.y;
    }
  };

  const onMouseMove = (e) => {
    if (isSelecting && selection) {
      const rect = canvasRef.current.getBoundingClientRect();
      const w = e.clientX - rect.left - selection.x;
      const h = e.clientY - rect.top - selection.y;
      setSelection({ ...selection, w, h });
    } else if (drag.current.dragging) {
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      setImgPos({ x: drag.current.originX + dx, y: drag.current.originY + dy });
    }
  };

  const onMouseUp = () => {
    drag.current.dragging = false;
    setIsSelecting(false);
  };

  const onMouseLeave = () => {
    drag.current.dragging = false;
    setIsSelecting(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert("No hay imagen para guardar");
      return;
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "imagen-editada.png";
    link.click();
  };

  const handleReset = () => {
    setKv(75);
    setMa(50);
    setInputKv(75);
    setInputMa(50);
    setImgPos({ x: 0, y: 0 });
    setSelection(null);

    if (originalImage.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const restored = new Image();
      restored.src = originalImage.current;
      restored.onload = () => {
        canvas.width = restored.width;
        canvas.height = restored.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(restored, 0, 0);
      };
    }
  };

  const applyValues = () => {
    if (selection) {
      // Recortar imagen
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const { x, y, w, h } = selection;
      const cropped = ctx.getImageData(x, y, w, h);

      canvas.width = w;
      canvas.height = h;
      ctx.putImageData(cropped, 0, 0);
      setSelection(null);
    } else {
      // Lógica previa del botón
      if (clickCount === 0) {
        setClickCount(1);
        setBtnSetText("Preparation");
        setBtnSetColor("#ffdd00ff");
      } else {
        setBtnSetText("X Ray");
        setBtnSetColor("#ff0000ff");
        setKv(inputKv);
        setMa(inputMa);
        setTimeout(() => {
          setClickCount(0);
          setBtnSetText("Set");
          setBtnSetColor("#1d74d7");
        }, inputMs);
      }
    }
  };

  const handleImageChange = (e) => {
    setSelectedImage(e.target.value);
  };

  return (
    <div className="container">
      <div className="left-panel">
        <p>Mantén presionada la tecla <b>Shift</b> y arrastra con el mouse para seleccionar área a recortar</p>
        <select onChange={handleImageChange} value={selectedImage} style={{ marginBottom: 10 }}>
          <option value="http://192.168.2.105:3001/api/abdomen">Abdomen</option>
          <option value="http://192.168.2.105:3001/api/cabeza">Cabeza</option>
          <option value="http://192.168.2.105:3001/api/mano">Mano</option>
          <option value="http://192.168.2.105:3001/api/pelvis">Pelvis</option>
          <option value="http://192.168.2.105:3001/api/pie">Pie</option>
          <option value="http://192.168.2.105:3001/api/torax">Tórax</option>
        </select>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
      </div>
      <div className="right-panel">
        <div>
          <label>kV (contraste)</label><br />
          <input
            type="number"
            min="10"
            max="120"
            value={inputKv}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 10 && val <= 120) setInputKv(val);
            }}
          />
          <br /><br /><br />
          <label>mA (brillo)</label><br />
          <input
            type="number"
            min="0"
            max="100"
            value={inputMa}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 0 && val <= 100) setInputMa(val);
            }}
          />
          <br /><br />
          <label>ms (milisegundos)</label><br />
          <input
            type="number"
            min="100"
            max="5000"
            value={inputMs}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 100 && val <= 5000) setInputMs(val);
            }}
          />
        </div>
        <div className="button-group">
          <button 
            className="btn-set" 
            onClick={applyValues} 
            style={{ background: btnSetColor }}
          >
            {btnSetText}
          </button>
          <button className="btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button className="btn-save" onClick={handleSave}>
            Guardar Imagen
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

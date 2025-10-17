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
  const [showImage, setShowImage] = useState(false);

  // Nuevos estados para los sliders de tamaño del canvas
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const drag = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const img = useRef(new Image());
  const scaleRef = useRef(1);
  const [selectedImage, setSelectedImage] = useState("http://192.168.2.103:3001/api/abdomen");
  const [pendingImage, setPendingImage] = useState("http://192.168.2.103:3001/api/abdomen");

  // Estados para recorte
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);

  // Imagen original para resetear
  const originalImage = useRef(null);

  // Configuraciones de kVp y mA según la tabla
  const examConfigurations = {
    "http://192.168.2.103:3001/api/abdomen": { kv: 85, ma: 24 },
    "http://192.168.2.103:3001/api/cabeza": { kv: 80, ma: 10 },
    "http://192.168.2.103:3001/api/mano": { kv: 55, ma: 2 },
    "http://192.168.2.103:3001/api/pelvis": { kv: 80, ma: 18 },
    "http://192.168.2.103:3001/api/pie": { kv: 55, ma: 3 },
    "http://192.168.2.103:3001/api/torax": { kv: 110, ma: 4 }
  };

  useEffect(() => {
    if (!showImage) return;
    
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
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
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
  }, [selectedImage, showImage, canvasWidth, canvasHeight]);

  const drawImage = () => {
    if (!showImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = scaleRef.current;
    ctx.save();
    ctx.scale(scale, scale);
    
    // MODIFICACIÓN: Invertir la relación del brillo con mA
    // A mayor mA, menor brillo (valor entre 0.1 y 2.0)
    const brightness = Math.max(0.1, 2.0 - (ma / 50));
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
    if (!imageLoaded || !showImage) return;
    drawImage();
    const handleResize = () => {
      drawImage();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [kv, ma, imgPos, imageLoaded, selection, showImage, canvasWidth, canvasHeight]);

  const onMouseDown = (e) => {
    if (!showImage) return;
    
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
    if (!showImage) return;
    
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
    if (!showImage) return;
    
    drag.current.dragging = false;
    setIsSelecting(false);
  };

  const onMouseLeave = () => {
    if (!showImage) return;
    
    drag.current.dragging = false;
    setIsSelecting(false);
  };

  const handleSave = () => {
    if (!showImage) {
      alert("No hay imagen para guardar");
      return;
    }
    
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
    setShowImage(false);
    setImageLoaded(false);
    setClickCount(0);
    setBtnSetText("Set");
    setBtnSetColor("initialColor");
    // Restaurar la imagen seleccionada actual
    setSelectedImage(pendingImage);
    // Resetear tamaño del canvas a valores por defecto
    setCanvasWidth(800);
    setCanvasHeight(600);

    if (originalImage.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const restored = new Image();
      restored.src = originalImage.current;
      restored.onload = () => {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(restored, 0, 0);
      };
    }
  };

  const applyValues = () => {
    if (showImage && selection) {
      // Recortar imagen (solo si la imagen está visible)
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
        // Actualizar la imagen seleccionada con la pendiente antes de mostrar
        setSelectedImage(pendingImage);
        setShowImage(true);
        setTimeout(() => {
          setClickCount(0);
          setBtnSetText("Set");
          setBtnSetColor("#1d74d7");
        }, inputMs);
      }
    }
  };

  const handleImageChange = (e) => {
    const selectedUrl = e.target.value;
    setPendingImage(selectedUrl);
    
    // Actualizar kV y mA según la configuración del examen seleccionado
    const config = examConfigurations[selectedUrl];
    if (config) {
      setInputKv(config.kv);
      setInputMa(config.ma);
    }
  };

  return (
    <div className="container">
      <div className="left-panel">
        {/* Sliders para tamaño del canvas */}
        <div className="sliders-container">
          <div className="slider-group">
            <p>Width {canvasWidth}</p>
            <input
              type="range"
              min="200"
              max="1000"
              step="10"
              value={canvasWidth}
              onChange={(e) => setCanvasWidth(parseInt(e.target.value))}
              className="slider"
            />
          </div>
          <div className="slider-group">
            <p>Height: {canvasHeight}</p>
            <input
              type="range"
              min="100"
              max="900"
              step="10"
              value={canvasHeight}
              onChange={(e) => setCanvasHeight(parseInt(e.target.value))}
              className="slider"
            />
          </div>
        </div>

        <select onChange={handleImageChange} value={pendingImage} style={{ marginBottom: 10 }}>
          <option value="http://192.168.2.103:3001/api/abdomen">Abdomen</option>
          <option value="http://192.168.2.103:3001/api/cabeza">Cabeza</option>
          <option value="http://192.168.2.103:3001/api/mano">Mano</option>
          <option value="http://192.168.2.103:3001/api/pelvis">Pelvis</option>
          <option value="http://192.168.2.103:3001/api/pie">Pie</option>
          <option value="http://192.168.2.103:3001/api/torax">Tórax</option>
        </select>
        
        {/* Mostrar mensaje cuando no hay imagen */}
        {!showImage && (
          <div style={{ 
            border: "2px dashed #ccc", 
            padding: "50px", 
            textAlign: "center", 
            marginTop: "20px",
            backgroundColor: "#f9f9f9"
          }}>
            <p>La imagen aparecerá después de hacer clic en el botón "X Ray"</p>
            <p><small>Imagen seleccionada: {pendingImage.split('/').pop()}</small></p>
          </div>
        )}
        
        {/* Canvas solo visible cuando showImage es true */}
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          style={{ 
            display: showImage ? "block" : "none",
            width: canvasWidth,
            height: canvasHeight
          }}
        />
        <p><small>Mantén presionada la tecla <b>Shift</b> y arrastra con el mouse para seleccionar área a recortar</small></p>
      </div>
      <div className="right-panel">
        <div>
          <label>kV </label><br />
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
          <label>mA </label><br />
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
          <label>ms </label><br />
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
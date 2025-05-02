import React, { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Button from "../Button/Button"; // Importa tu botón personalizado

function Carousel({ images = [], className = "" }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  // Actualiza el índice seleccionado cuando cambia el slide
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi, onSelect]);

  if (!images.length) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div ref={emblaRef} className="overflow-hidden rounded-2xl shadow-lg max-w-xl w-full bg-gray-900 h-64">
        <div className="flex h-64">
          {images.map((src, i) => (
            <div className="flex-[0_0_100%] flex items-center justify-center h-64" key={i}>
              <img src={src} alt="" className="object-cover w-full h-full" draggable="false" />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <>
          <div className="flex gap-2 mt-3">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi && emblaApi.scrollTo(idx)}
                className={`w-3 h-3 rounded-full border-2 border-[#eaff00] ${selected === idx ? "bg-[#eaff00]" : "bg-gray-700"}`}
                aria-label={`Ir a la imagen ${idx + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-4 mt-4">
            <Button
              texto="&#8592; Anterior"
              onClick={() => emblaApi && emblaApi.scrollPrev()}
              className="px-6 py-2 font-bold"
            />
            <Button
              texto="Siguiente &#8594;"
              onClick={() => emblaApi && emblaApi.scrollNext()}
              className="px-6 py-2 font-bold"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default Carousel;

import React, { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Button from "../Button/Button";

function Carousel({ images = [], className = "" }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

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
    <div className={'flex flex-col items-center ' + className}>
      <div
        ref={emblaRef}
        className='overflow-hidden rounded-2xl bg-gray-900'
        style={{ maxWidth: '36rem', width: '100%', height: '16rem' }} 
      >
        <div className='flex'>
          {images.map((src, i) => (
            <div
              className='flex-[0_0_100%] '
              style={{ height: '16rem' }}
              key={i}
            >
              <img
                src={src}
                alt=''
                className='object-cover w-full h-full'
                draggable='false'
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <>
          <div className='flex mt-3' style={{ gap: '0.5rem' }}>
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi && emblaApi.scrollTo(idx)}
                className={
                  'rounded-full border-2 border-[#eaff00] ' +
                  (selected === idx ? 'bg-[#eaff00]' : 'bg-gray-700')
                }
                style={{ width: '0.75rem', height: '0.75rem' }}
                aria-label={'Ir a la imagen ' + (idx + 1)}
              />
            ))}
          </div>
          <div className='flex' style={{ gap: '1.5rem', marginTop: '1.5rem' }}>
            <Button
              texto='Anterior'
              onClick={() => emblaApi && emblaApi.scrollPrev()}
              className=''
              style={{ padding: '0.75rem 2rem', fontWeight: 'bold' }}
            />
            <Button
              texto='Siguiente'
              onClick={() => emblaApi && emblaApi.scrollNext()}
              className=''
              style={{ padding: '0.75rem 2rem', fontWeight: 'bold' }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default Carousel;

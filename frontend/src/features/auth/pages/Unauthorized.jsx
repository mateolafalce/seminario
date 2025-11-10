import React from 'react';
import Button from '../../../shared/components/ui/Button/Button';

function Unauthorized() {
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm border-danger">
            <div className="card-body text-center p-5">
              <h1 className="text-danger mb-4">¡No Autorizado!</h1>
              <p className="lead mb-3">
                Lo sentimos, no tienes los permisos necesarios para acceder a esta página.
              </p>
              <p className="mb-0">
                Por favor, contacta al administrador si crees que esto es un error.
              </p>
              <Button
                texto="Volver atrás"
                onClick={() => window.history.back()}
                className="btn btn-outline-secondary mt-3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;
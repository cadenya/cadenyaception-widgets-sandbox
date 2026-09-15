import { travelCardSchema } from "./travel-card-schema";

export function TravelCard({ args }: { args: unknown }) {
  const parsed = travelCardSchema.safeParse(args);
  if (!parsed.success)
    return (
      <div className="resource-card" role="status">
        This travel suggestion could not be displayed. Ask the concierge to try again.
      </div>
    );
  const card = parsed.data;
  return (
    <article className="resource-card">
      <div className="resource-card-top">
        <span>{card.kind}</span>
        <span className="resource-state">Trip idea</span>
      </div>
      <h2>{card.title}</h2>
      {card.location && (
        <p>
          <strong>{card.location}</strong>
        </p>
      )}
      {card.description && <p>{card.description}</p>}
      {card.highlights.length > 0 && (
        <ul>
          {card.highlights.map((highlight, index) => (
            <li key={index}>{highlight}</li>
          ))}
        </ul>
      )}
      {(card.timing || card.budget) && (
        <dl>
          {card.timing && (
            <div>
              <dt>Suggested timing</dt>
              <dd>{card.timing}</dd>
            </div>
          )}
          {card.budget && (
            <div>
              <dt>Estimated budget</dt>
              <dd>{card.budget}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="travel-card-note">
        Planning inspiration. Confirm prices and availability before booking.
      </p>
    </article>
  );
}

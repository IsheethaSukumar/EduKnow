from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import get_db
from models import User, Content, Collection, CollectionItem
from schemas import (
    CollectionCreate, CollectionResponse, CollectionItemAdd,
    CollectionItemResponse, ContentResponse,
)
from routers.auth import get_current_user
from routers.content import content_to_response

router = APIRouter(prefix="/api/collections", tags=["Collections"])


def collection_to_response(
    coll: Collection, db: Session, include_items: bool = False
) -> CollectionResponse:
    items = []
    if include_items:
        for item in sorted(coll.items, key=lambda x: x.order):
            content = db.query(Content).filter(Content.id == item.content_id).first()
            if content:
                items.append(CollectionItemResponse(
                    id=item.id,
                    content_id=item.content_id,
                    content=content_to_response(content, db),
                    order=item.order,
                    added_at=item.added_at,
                ))
    return CollectionResponse(
        id=coll.id,
        name=coll.name,
        description=coll.description,
        color=coll.color,
        is_public=coll.is_public,
        item_count=len(coll.items),
        items=items,
        created_at=coll.created_at,
        updated_at=coll.updated_at,
    )


@router.post("/", response_model=CollectionResponse)
def create_collection(
    data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new content collection."""
    coll = Collection(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        color=data.color,
        is_public=data.is_public,
    )
    db.add(coll)
    db.commit()
    db.refresh(coll)
    return collection_to_response(coll, db)


@router.get("/", response_model=List[CollectionResponse])
def list_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's collections."""
    colls = (
        db.query(Collection)
        .filter(Collection.user_id == current_user.id)
        .order_by(Collection.updated_at.desc())
        .all()
    )
    return [collection_to_response(c, db) for c in colls]


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a collection with all items."""
    coll = db.query(Collection).filter(Collection.id == collection_id).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
    if coll.user_id != current_user.id and not coll.is_public:
        raise HTTPException(status_code=403, detail="Not authorized")
    return collection_to_response(coll, db, include_items=True)


@router.post("/{collection_id}/items")
def add_item_to_collection(
    collection_id: str,
    data: CollectionItemAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a content item to a collection."""
    coll = db.query(Collection).filter(
        Collection.id == collection_id, Collection.user_id == current_user.id
    ).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Check if already in collection
    existing = db.query(CollectionItem).filter(
        CollectionItem.collection_id == collection_id,
        CollectionItem.content_id == data.content_id,
    ).first()
    if existing:
        return {"message": "Already in collection"}

    # Get next order
    max_order = db.query(CollectionItem).filter(
        CollectionItem.collection_id == collection_id
    ).count()

    item = CollectionItem(
        collection_id=collection_id,
        content_id=data.content_id,
        order=max_order,
    )
    db.add(item)
    coll.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Added to collection"}


@router.delete("/{collection_id}/items/{content_id}")
def remove_item_from_collection(
    collection_id: str,
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a content item from a collection."""
    coll = db.query(Collection).filter(
        Collection.id == collection_id, Collection.user_id == current_user.id
    ).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    item = db.query(CollectionItem).filter(
        CollectionItem.collection_id == collection_id,
        CollectionItem.content_id == content_id,
    ).first()
    if item:
        db.delete(item)
        coll.updated_at = datetime.utcnow()
        db.commit()
    return {"message": "Removed from collection"}


@router.delete("/{collection_id}")
def delete_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a collection and all its items."""
    coll = db.query(Collection).filter(
        Collection.id == collection_id, Collection.user_id == current_user.id
    ).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(coll)
    db.commit()
    return {"message": "Collection deleted"}
